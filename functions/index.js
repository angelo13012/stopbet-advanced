const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();

const stripeSecret = defineSecret("STRIPE_SECRET");

// Prix officiels — source de vérité côté serveur
const PRICES = {
  monthly: 349,  // 3.49€ en centimes
  yearly:  3000, // 30.00€ en centimes
};

const VALID_PLANS = ['monthly', 'yearly'];

exports.createCheckoutSession = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Non authentifie");
    }

    const { plan, successUrl, cancelUrl } = request.data;

    // Validation stricte du plan
    if (!VALID_PLANS.includes(plan)) {
      throw new HttpsError("invalid-argument", "Plan invalide");
    }

    // Validation des URLs
    if (!successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "URLs manquantes");
    }

    const stripeClient = stripe(stripeSecret.value());
    const amount = PRICES[plan]; // Prix imposé par le serveur

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
            unit_amount: amount, // Montant imposé par le serveur, jamais par le client
            recurring: { interval: plan === "yearly" ? "year" : "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}&plan=" + plan,
        cancel_url: cancelUrl,
        metadata: { 
          userId: request.auth.uid, 
          plan,
          expectedAmount: amount.toString(),
        },
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

    const { sessionId, plan } = request.data;

    // Validation stricte
    if (!sessionId || !VALID_PLANS.includes(plan)) {
      throw new HttpsError("invalid-argument", "Données invalides");
    }

    const stripeClient = stripe(stripeSecret.value());

    try {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      // Vérifier que le paiement est bien réussi
      if (session.payment_status !== "paid") {
        throw new HttpsError("failed-precondition", "Paiement non confirme");
      }

      // Vérifier que le montant payé correspond exactement au prix attendu
      const expectedAmount = PRICES[plan];
      const lineItems = await stripeClient.checkout.sessions.listLineItems(sessionId);
      const paidAmount = lineItems.data[0]?.amount_total;

      if (paidAmount !== expectedAmount) {
        console.error(`Montant invalide: attendu ${expectedAmount}, reçu ${paidAmount}`);
        throw new HttpsError("permission-denied", "Montant de paiement invalide");
      }

      // Vérifier que la session appartient bien à cet utilisateur
      if (session.metadata?.userId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Session invalide");
      }

      // Tout est valide — mettre à jour Firestore via Admin SDK (bypass des règles de sécurité)
      await admin.firestore().collection("users").doc(request.auth.uid).update({
        subscriptionType:   "premium",
        subscriptionStatus: "active",
        subscriptionPlan:   plan,
        subscribedAt:       new Date().toISOString(),
        stripeSessionId:    sessionId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }
  }
);