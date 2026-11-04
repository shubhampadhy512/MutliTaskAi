
import { cert, initializeApp } from "firebase-admin/app";

import serviceAccount from "../multitaskai-29234-firebase-adminsdk-fbsvc-5046364eb0.json" with { type: "json" };

export const app = initializeApp({
    credential: cert(serviceAccount)
});
