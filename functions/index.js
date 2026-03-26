const functions = require("firebase-functions");
const stripe = require("stripe");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Non authentifie");
  }

  const stripeClient = stripe(functions.config().stripe.secret);
  const { plan, successUrl, cancelUrl } = data;
  const priceId = plan === "yearly" ? "price_yearly" : "price_monthly";
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
      metadata: { userId: context.auth.uid, plan },
    });

    return { url: session.url };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.confirmCheckout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Non authentifie");
  }

  const stripeClient = stripe(functions.config().stripe.secret);
  const { sessionId, plan } = data;

  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await admin.firestore().collection("users").doc(context.auth.uid).update({
        subscriptionType: "premium",
        subscriptionStatus: "active",
        subscriptionPlan: plan,
        subscribedAt: new Date().toISOString(),
      });
      return { success: true };
    }

    throw new functions.https.HttpsError("failed-precondition", "Paiement non confirme");
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});