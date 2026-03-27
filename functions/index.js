const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();

const stripeSecret = defineSecret("STRIPE_SECRET");

exports.createCheckoutSession = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Non authentifie");
    }

    const stripeClient = stripe(stripeSecret.value());
    const { plan, successUrl, cancelUrl } = request.data;
    const amount = plan === "yearly" ? 3000 : 300;

    try {
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: plan === "yearly" ? "StopBet Premium Annuel" : "StopBet Premium Mensuel",
              description: plan === "yearly" ? "2 mois offerts" : "Accès à toutes les fonctionnalités",
            },
            unit_amount: amount,
            recurring: { interval: plan === "yearly" ? "year" : "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}&plan=" + plan,
        cancel_url: cancelUrl,
        metadata: { userId: request.auth.uid, plan },
      });
      return { url: session.url };
    } catch (error) {
      throw new HttpsError("internal", error.message);
    }
  }
);

exports.confirmCheckout = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Non authentifie");
    }

    const stripeClient = stripe(stripeSecret.value());
    const { sessionId, plan } = request.data;

    try {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        await admin.firestore().collection("users").doc(request.auth.uid).update({
          subscriptionType: "premium",
          subscriptionStatus: "active",
          subscriptionPlan: plan,
          subscribedAt: new Date().toISOString(),
        });
        return { success: true };
      }
      throw new HttpsError("failed-precondition", "Paiement non confirme");
    } catch (error) {
      throw new HttpsError("internal", error.message);
    }
  }
);