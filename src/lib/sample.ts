export const SAMPLE_TITLE = "Lecture 7 — How Neural Networks Learn";

export const SAMPLE_LECTURE = `Lecture 7: How Neural Networks Learn — Loss, Gradient Descent and Backpropagation

1. The learning problem
A neural network is a parameterised function f(x; θ) that maps an input x to a prediction ŷ. The parameters θ are the weights and biases of every layer. "Learning" means finding parameters that make predictions match the true labels y on the training data, while still generalising to unseen data.

2. Loss functions
A loss function L(ŷ, y) measures how wrong a single prediction is. For regression we usually use Mean Squared Error: MSE = average of (ŷ − y)². For classification we use cross-entropy loss: L = −Σ y_k log(p_k), where p_k are the softmax probabilities. Cross-entropy heavily punishes confident wrong predictions: predicting p = 0.01 for the true class costs −log(0.01) ≈ 4.6, while p = 0.9 costs only ≈ 0.1. The training objective is the average loss over the dataset, sometimes plus a regularisation term.

3. Gradient descent
The gradient ∇θL is the vector of partial derivatives of the loss with respect to every parameter. It points in the direction of steepest increase of the loss, so we step in the opposite direction: θ ← θ − η ∇θL. The learning rate η controls the step size. If η is too large, training diverges or oscillates around the minimum; if η is too small, training is extremely slow and can stall on plateaus.
Batch gradient descent computes the gradient on the whole dataset (accurate but slow). Stochastic gradient descent (SGD) uses one example at a time (noisy but cheap). Mini-batch SGD, the standard in practice, uses batches of e.g. 32–512 examples. The noise of mini-batches is actually helpful: it can help escape sharp minima and saddle points. One pass over the whole training set is called an epoch.

4. Backpropagation
Backpropagation is the algorithm that computes all gradients efficiently. It is just the chain rule of calculus applied systematically from the output layer backwards. In the forward pass, the network computes and stores every intermediate activation. In the backward pass, it starts from ∂L/∂ŷ and propagates the error signal backwards layer by layer: for each layer, the gradient with respect to its weights equals (error signal arriving at the layer) × (the layer's input activation). Because intermediate results are reused, backprop computes gradients for millions of parameters at roughly the cost of two forward passes. Backprop computes the gradients; gradient descent is the separate step that uses them to update the weights.

5. Activation functions and vanishing gradients
Without non-linear activation functions, stacking layers would collapse into a single linear function, so depth would be useless. Sigmoid squashes values into (0, 1), but its derivative is at most 0.25. When backprop multiplies many such small derivatives through deep networks, the gradient shrinks exponentially — the vanishing gradient problem — so early layers barely learn. ReLU, f(z) = max(0, z), has derivative 1 for positive inputs, which largely fixes vanishing gradients and is cheap to compute. Its weakness is "dying ReLU": neurons stuck in the negative region output 0 and receive zero gradient forever. Leaky ReLU fixes this with a small slope for negative inputs. The opposite problem, exploding gradients, is common in RNNs and is handled with gradient clipping.

6. Overfitting and regularisation
Overfitting happens when the model memorises the training data, including its noise: training loss keeps falling while validation loss starts rising. Remedies: more data, data augmentation, L2 regularisation (weight decay, which adds λ‖θ‖² to the loss and keeps weights small), dropout (randomly zeroing a fraction p of activations during training so neurons cannot co-adapt; dropout is turned off at inference), and early stopping (stop training when validation loss stops improving). Underfitting is the opposite: both training and validation loss are high because the model is too simple or trained too briefly.

7. Optimisers beyond SGD
Momentum keeps an exponentially decaying average of past gradients, which speeds up movement along consistent directions and damps oscillations. Adam combines momentum with per-parameter adaptive learning rates (based on a running average of squared gradients) and is the most common default optimiser. Learning-rate schedules (step decay, cosine decay, warm-up) change η during training.

Key takeaway: the loss defines what "good" means, backpropagation computes how each weight affects the loss, and gradient descent uses that information to improve the weights step by step.`;
