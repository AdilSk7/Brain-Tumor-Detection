# NeuroScan — Brain Tumour MRI Classifier

Flask web application for classifying brain MRI scans using a federated Xception model.

## Project Structure

```
project/
├── app.py                  # Flask backend
├── model.h5                # ← Place your trained model here
├── requirements.txt
├── static/
│   ├── style.css
│   └── script.js
└── templates/
    └── index.html
```

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Add your model

Copy your trained `model.h5` file into the project root (same folder as `app.py`).

### 3. Run

```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## How it works

1. User uploads a brain MRI image (PNG / JPG / WEBP / BMP, ≤16 MB)
2. Flask resizes it to 224×224, normalises pixel values to [0, 1]
3. Xception model predicts one of 4 classes: **Glioma · Meningioma · No Tumour · Pituitary**
4. Response includes predicted class, confidence %, and all class probabilities

## API

### `POST /predict`

**Form data:** `file` — image file

**Response (200):**
```json
{
  "prediction":  "glioma",
  "label":       "Glioma",
  "description": "A tumour that starts in the glial cells …",
  "severity":    "high",
  "color":       "#ef4444",
  "confidence":  97.34,
  "all_scores": {
    "glioma":      97.34,
    "meningioma":   1.22,
    "notumor":      0.88,
    "pituitary":    0.56
  }
}
```

**Error (4xx/5xx):**
```json
{ "error": "Description of error" }
```

## Notes

- Class order in the model must match: `["glioma", "meningioma", "notumor", "pituitary"]`
  If your model was trained with a different class ordering adjust `CLASS_NAMES` in `app.py`.
- For production deployment use Gunicorn and disable `debug=True`.
