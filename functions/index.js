const functions = require("firebase-functions");
const stripe = require("stripe");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Non authentifie");
  }
  const stripeClient = stripe(functions.config().stripe.secret);
  const { plan } = data;
  const amount = plan === "yearly" ? 3000 : 300;
  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: "eur",
      metadata: { userId: context.auth.uid, plan },
    });
    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.confirmSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Non authentifie");
  }
  const stripeClient = stripe(functions.config().stripe.secret);
  const { plan, paymentIntentId } = data;
  try {
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      throw new functions.https.HttpsError("failed-precondition", "Paiement non confirme");
    }
    await admin.firestore().collection("users").doc(context.auth.uid).update({
      subscriptionType: "premium",
      subscriptionStatus: "active",
      subscriptionPlan: plan,
      subscribedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
