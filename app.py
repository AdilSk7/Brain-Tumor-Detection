import os
import io
import json
import numpy as np
from flask import Flask, request, jsonify, render_template
from PIL import Image
import tensorflow as tf

app = Flask(__name__)

# ── Config ──────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.h5")
IMG_SIZE   = (224, 224)
CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]

CLASS_META = {
    "glioma": {
        "label":       "Glioma",
        "description": "A tumour that starts in the glial cells of the brain or spinal cord.",
        "severity":    "high",
        "color":       "#ef4444",
    },
    "meningioma": {
        "label":       "Meningioma",
        "description": "A tumour that forms on the membranes surrounding the brain and spinal cord.",
        "severity":    "medium",
        "color":       "#f59e0b",
    },
    "notumor": {
        "label":       "No Tumour",
        "description": "No tumour detected. The MRI appears within normal range.",
        "severity":    "none",
        "color":       "#10b981",
    },
    "pituitary": {
        "label":       "Pituitary",
        "description": "A tumour located at the base of the brain affecting the pituitary gland.",
        "severity":    "medium",
        "color":       "#6366f1",
    },
}

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}

# ── Load model ───────────────────────────────────────────────────────────────
model = None

def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] model.h5 not found at {MODEL_PATH}. "
              "Place your trained model there before running predictions.")
        return
    print("[INFO] Loading model …")
    model = tf.keras.models.load_model(MODEL_PATH)
    print("[INFO] Model loaded successfully.")

# ── Helpers ──────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess(file_bytes: bytes) -> np.ndarray:
    """Resize to 224×224, convert to RGB, normalise to [0, 1]."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)          # shape: (1, 224, 224, 3)

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    # ── Validate request ──
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS).upper()}"
        }), 400

    # ── Check model loaded ──
    if model is None:
        return jsonify({
            "error": "Model not loaded. Place model.h5 in the project root and restart the server."
        }), 503

    # ── Predict ──
    try:
        file_bytes = file.read()
        x = preprocess(file_bytes)
        preds = model.predict(x, verbose=0)[0]          # shape: (4,)

        pred_idx   = int(np.argmax(preds))
        pred_class = CLASS_NAMES[pred_idx]
        confidence = float(preds[pred_idx]) * 100

        all_scores = {
            CLASS_NAMES[i]: round(float(preds[i]) * 100, 2)
            for i in range(len(CLASS_NAMES))
        }

        meta = CLASS_META[pred_class]

        return jsonify({
            "prediction": pred_class,
            "label":       meta["label"],
            "description": meta["description"],
            "severity":    meta["severity"],
            "color":       meta["color"],
            "confidence":  round(confidence, 2),
            "all_scores":  all_scores,
        })

    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {str(exc)}"}), 500


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_model()
    app.run(debug=True, host="0.0.0.0", port=5000)
