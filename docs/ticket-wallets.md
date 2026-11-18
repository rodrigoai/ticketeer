# Ticket downloads and wallets

PDF downloads work without external credentials. Each PDF contains the event, local date and time, ticket owner, delivery email, and the same QR code used at check-in.

Wallet buttons appear only when the corresponding server credentials are configured. iPhone and iPad show Apple Wallet, Android shows Google Wallet, and desktop shows the configured choices. Adding a pass always requires the user's confirmation in the wallet; a website cannot silently install it.

The export endpoints validate the purchase link, confirmed order, and ticket membership. Multiple-ticket purchases cannot export tickets until owner details are complete. Secrets remain on the server. These are static admission passes; live pass updates and revocation notifications are not implemented.

## Apple Wallet

Register a Pass Type ID in your Apple Developer account and create its signing certificate. Supply the matching private key and Apple WWDR intermediate certificate as PEM values in deployment secrets:

```text
APPLE_WALLET_PASS_TYPE_ID=pass.com.example.ticketeer
APPLE_WALLET_TEAM_ID=YOUR_TEAM_ID
APPLE_WALLET_SIGNER_CERT=<PEM certificate>
APPLE_WALLET_SIGNER_KEY=<PEM private key>
APPLE_WALLET_WWDR_CERT=<PEM intermediate certificate>
APPLE_WALLET_KEY_PASSPHRASE=<optional encrypted-key password>
WALLET_ORGANIZATION_NAME=Ticketeer
```

Multiline PEM values and literal `\n` separators are accepted. Never use a `VITE_` prefix for these secrets. The generated `.pkpass` is signed server-side and includes the ticket's existing admission QR. Test installation on a physical iPhone with a valid Apple-issued certificate before enabling this in production. Renew certificates before they expire.

[Apple's setup guide](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates/)

## Google Wallet

Create a Google Wallet issuer account, enable the Google Wallet API for a Google Cloud project, and authorize the signing service account in the Wallet console. Supply these deployment secrets:

```text
GOOGLE_WALLET_ISSUER_ID=YOUR_ISSUER_ID
GOOGLE_WALLET_CLIENT_EMAIL=wallet-signer@example.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY=<PEM RSA private key>
WALLET_ORGANIZATION_NAME=Ticketeer
```

The server signs an RS256 Save to Wallet JWT containing an event-specific event ticket class and a stable object per ticket. Google creates them when the user saves the pass. No Google client secret or private key is exposed to the browser. The user must sign in to their Google account to save a pass. Demo accounts can issue only test passes to authorized testers; request publishing access before public launch. Test saving on Android before enabling public sales.

[Google Wallet onboarding](https://developers.google.com/wallet/tickets/events/getting-started/onboarding-guide)

[Google's JWT creation flow](https://developers.google.com/wallet/tickets/events/use-cases/jwt)

## Verification

Run `yarn test --runInBand` and `yarn build`. Unit tests exercise PDF generation, signed Google JWT claims, Apple pass archives with temporary test certificates, export access controls, device detection, and success-page rendering. Test certificates are generated in memory and are never valid production credentials. Real wallet installation still requires issuer accounts and device testing.
