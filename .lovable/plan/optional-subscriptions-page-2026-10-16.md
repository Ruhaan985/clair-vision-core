# Optional subscriptions page

## What will change
- Add a Subscriptions link to the existing sidebar and a dedicated page that fits the current Aster theme and mobile layout.
- Present four optional plans with catchy names: $2 monthly, $5 quarterly, $7 yearly, and $15 for two years. Keep the existing free experience available.
- Show the uploaded UPI QR code and the selected plan amount with clear scan-to-pay instructions.
- Make it clear that QR payments are not automatically verified or activated in the app.

## Technical details
- Use the existing TanStack file-route conventions, add page-specific metadata, and import the uploaded QR asset pointer.
- Do not add payment processing, accounts, or entitlement logic; this request only adds plan selection and QR payment information.
