# Firebase configuration

The tracker stores payment transactions in `expenses` and its single loan configuration in `settings/homeLoan`.

Firestore rules are version-controlled in `firestore.rules`. Before deploying them to an existing Firebase project, compare the live rules in the Firebase console with this file and preserve any unrelated collections.

After selecting the correct project with the Firebase CLI, deploy only the rules:

```sh
firebase deploy --only firestore:rules
```

The current app uses a client-side passphrase and does not sign users into Firebase Authentication. Consequently, the checked-in rules retain the existing public client access for `expenses` and grant equivalent access only to `settings/homeLoan`. For stronger security, migrate the app to Firebase Authentication and replace `if true` with authenticated-user checks.
