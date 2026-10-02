# Final-Research — Gate Appointment System (Component 3/4)

Congestion-aware truck appointment and gate-lane assignment for a container
terminal. Two trained models answer one question: *which lane, and when will
this truck be through the gate?*

| Model | Algorithm | Predicts | Test result |
|---|---|---|---|
| Clearance time | XGBoost (RF compared) | minutes to clear the gate | RMSE 3.0 min vs 11.1 baseline |
| Congestion forecast | SARIMAX per lane (24h seasonality) | queue length per lane/hour | beats naive baseline on RMSE for all 6 lanes |

## How the models use the user's input

`POST /api/assign-appointment` takes the booking form values:
container type, cargo category, carrier, customs risk, missing documents,
carrier reliability, planned arrival date and hour.

1. Congestion model: forecast queue for every lane at the planned arrival hour.
2. The lowest-queue lane is assigned.
3. Clearance model: predicts clearance minutes from all inputs plus that lane's queue.
4. Gate entry = arrival + estimated queue wait; departure = entry + clearance.

The response echoes the exact model inputs and per-lane forecasts, and the UI
shows them. Change any input and resubmit to see the prediction move.

## Run

```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Retrain: `python ml/src/train_clearance_time_model.py`,
`python ml/src/train_congestion_forecast_models.py`, then
`python ml/src/export_congestion_forecasts.py`.

## Known limitations

- The forecast covers one week after the training cutoff; a chosen date maps onto it by hour-of-week.
- Wait time is queue length x 5.5 min (no separate model).
- Document Upload is still a mock; no-show model, overbooking and SHAP are planned.
