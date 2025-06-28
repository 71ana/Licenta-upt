import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

df = pd.read_csv('final_dataset.csv')

df = df.replace([float('inf'), float('-inf')], pd.NA).dropna()

X = df.drop('Label', axis=1)
y = df['Label']

le = LabelEncoder()
y_encoded = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=25,
    min_samples_split=10,
    min_samples_leaf=4,
    max_features='sqrt',
    random_state=42,
    n_jobs=-1,
    class_weight='balanced'
)

model.fit(X_train, y_train)

joblib.dump({
    'model': model,
    'encoder': le,
    'feature_names': X.columns.tolist()
}, 'anomaly_detector_model.pkl')

y_pred = model.predict(X_test)

report = classification_report(
    y_test, y_pred,
    labels=le.transform(le.classes_),
    target_names=le.classes_,
    zero_division=0
)
print("\nClassification Report:")
print(report)

with open('classification_report.txt', 'w', encoding='utf-8') as f:
    f.write(report)

cm = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(14, 10))
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=le.classes_,
    yticklabels=le.classes_
)
plt.xlabel('Predicted Label')
plt.ylabel('True Label')
plt.title('Confusion Matrix')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=300)
plt.show()

print("\nPer-class accuracy:")
for i, class_name in enumerate(le.classes_):
    class_accuracy = cm[i, i] / cm[i, :].sum()
    print(f"{class_name}: {class_accuracy:.3f}")
