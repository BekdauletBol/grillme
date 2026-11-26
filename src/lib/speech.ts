"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "./schemas";

/* Minimal typings for the Web Speech API (not in lib.dom for all TS versions). */
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

const noopSubscribe = () => () => {};

const LOCALE: Record<Lang, string> = { en: "en-US", ru: "ru-RU" };

export function useSpeechInput(lang: Lang) {
  const hasApi = useSyncExternalStore(noopSubscribe, () => !!getRecognitionCtor(), () => false);
  const [denied, setDenied] = useState(false);
  const supported = hasApi && !denied;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const wantRef = useRef(false);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    finalRef.current = "";
    setTranscript("");
    const rec = new Ctor();
    rec.lang = LOCALE[lang];
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setDenied(true);
      }
    };
    // Chrome stops after silence; restart while the user still wants to talk.
    rec.onend = () => {
      if (wantRef.current) {
        try { rec.start(); return; } catch { /* fallthrough */ }
      }
      setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    return finalRef.current.trim();
  }, []);

  useEffect(() => () => { wantRef.current = false; recRef.current?.abort(); }, []);

  return { supported, listening, transcript, setTranscript, start, stop };
}

export function useSpeaker(lang: Lang) {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!enabled || typeof window === "undefined" || !window.speechSynthesis || !text) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = LOCALE[lang];
        const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith(lang));
        const preferred =
          voices.find((v) => /Google|Natural|Premium|Enhanced|Samantha|Daniel|Milena/i.test(v.name)) ?? voices[0];
        if (preferred) u.voice = preferred;
        u.rate = 1.05;
        u.onstart = () => setSpeaking(true);
        u.onend = u.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(u);
      }),
    [enabled, lang],
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    // Warm up voice list (Chrome loads it async).
    if (typeof window !== "undefined") window.speechSynthesis?.getVoices();
  }, []);

  return { speak, cancel, speaking, enabled, setEnabled };
}
