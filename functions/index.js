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

// ── Checkout normal (sans trial) ──
exports.createCheckoutSession = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");

    const { plan, successUrl, cancelUrl } = request.data;
    if (!VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Plan invalide");
    if (!successUrl || !cancelUrl)   throw new HttpsError("invalid-argument", "URLs manquantes");

    const stripeClient = stripe(stripeSecret.value());
    const amount = PRICES[plan];

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
        cancel_url:  cancelUrl,
        metadata: { userId: request.auth.uid, plan, expectedAmount: amount.toString() },
      });
      return { url: session.url };
    } catch (error) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ── Checkout avec essai 7 jours gratuits ──
exports.createTrialSession = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");

    const { plan, successUrl, cancelUrl } = request.data;
    if (!VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Plan invalide");
    if (!successUrl || !cancelUrl)   throw new HttpsError("invalid-argument", "URLs manquantes");

    // Vérifier que l'utilisateur n'a pas déjà utilisé son essai
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.trialUsed) {
      throw new HttpsError("failed-precondition", "Essai gratuit déjà utilisé");
    }

    const stripeClient = stripe(stripeSecret.value());
    const amount = PRICES[plan];

    try {
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: plan === "yearly" ? "StopBet Premium Annuel" : "StopBet Premium Mensuel",
              description: "7 jours gratuits, puis facturation automatique",
            },
            unit_amount: amount,
            recurring: { interval: plan === "yearly" ? "year" : "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 7, // 7 jours gratuits — Stripe gère le débit automatique
        },
        success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}&plan=" + plan + "&trial=true",
        cancel_url:  cancelUrl,
        metadata: { userId: request.auth.uid, plan, trial: "true" },
      });
      return { url: session.url };
    } catch (error) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ── Confirmer le checkout (normal ou trial) ──
exports.confirmCheckout = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");

    const { sessionId, plan, trial } = request.data;
    if (!sessionId || !VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Données invalides");

    const stripeClient = stripe(stripeSecret.value());

    try {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      // Pour un trial, le statut est "no_payment_required" au début
      const isTrial = trial === true || session.metadata?.trial === "true";
      const validStatus = isTrial
        ? ["no_payment_required", "paid"]
        : ["paid"];

      if (!validStatus.includes(session.payment_status)) {
        throw new HttpsError("failed-precondition", "Paiement non confirme");
      }

      // Vérifier montant seulement pour les paiements non-trial
      if (!isTrial) {
        const expectedAmount = PRICES[plan];
        const lineItems = await stripeClient.checkout.sessions.listLineItems(sessionId);
        const paidAmount = lineItems.data[0]?.amount_total;
        if (paidAmount !== expectedAmount) {
          throw new HttpsError("permission-denied", "Montant de paiement invalide");
        }
      }

      // Vérifier que la session appartient à cet utilisateur
      if (session.metadata?.userId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Session invalide");
      }

      // Calculer la date de fin de trial
      const trialEndsAt = isTrial
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Mettre à jour Firestore
      const updateData = {
        subscriptionType:   "premium",
        subscriptionStatus: "active",
        subscriptionPlan:   plan,
        subscribedAt:       new Date().toISOString(),
        stripeSessionId:    sessionId,
      };

      if (isTrial) {
        updateData.trialUsed    = true;
        updateData.trialEndsAt  = trialEndsAt;
        updateData.isTrial      = true;
      }

      await admin.firestore().collection("users").doc(request.auth.uid).update(updateData);

      return { success: true, isTrial, trialEndsAt };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }
  }
);

// ── Générer un lien de parrainage unique ──
exports.generateReferralCode = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");

    const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    // Si code déjà existant, le retourner
    if (userData?.referralCode) {
      return { code: userData.referralCode };
    }

    // Générer un code unique
    const code = request.auth.uid.slice(0, 8).toUpperCase();
    await admin.firestore().collection("users").doc(request.auth.uid).update({
      referralCode: code,
      referralCount: 0,
    });

    return { code };
  }
);

// ── Appliquer un code de parrainage à l'inscription ──
exports.applyReferralCode = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");

    const { code } = request.data;
    if (!code) throw new HttpsError("invalid-argument", "Code manquant");

    // Vérifier que l'utilisateur n'a pas déjà utilisé un code
    const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.referralApplied) {
      throw new HttpsError("failed-precondition", "Code déjà utilisé");
    }

    // Trouver le parrain par son code
    const referrersSnap = await admin.firestore()
      .collection("users")
      .where("referralCode", "==", code.toUpperCase())
      .limit(1)
      .get();

    if (referrersSnap.empty) {
      throw new HttpsError("not-found", "Code invalide");
    }

    const referrerDoc  = referrersSnap.docs[0];
    const referrerId   = referrerDoc.id;

    // Empêcher l'auto-parrainage
    if (referrerId === request.auth.uid) {
      throw new HttpsError("invalid-argument", "Tu ne peux pas utiliser ton propre code");
    }

    const referrerData = referrerDoc.data();
    const newCount     = (referrerData.referralCount ?? 0) + 1;

    // Récompenser le parrain — 1 mois offert tous les 3 filleuls
    const batch = admin.firestore().batch();

    // Mettre à jour le parrain
    batch.update(referrerDoc.ref, {
      referralCount: newCount,
      // Tous les 3 filleuls → 1 mois offert (géré manuellement ou via webhook)
    });

    // Marquer le filleul comme ayant utilisé un code + lui offrir 7 jours bonus
    const bonusEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    batch.update(admin.firestore().collection("users").doc(request.auth.uid), {
      referralApplied:   true,
      referredBy:        referrerId,
      referralBonusEnds: bonusEndsAt,
      subscriptionType:  "premium",
      subscriptionStatus: "active",
      isTrial:           true,
      trialEndsAt:       bonusEndsAt,
    });

    await batch.commit();

    return { success: true, bonusEndsAt, referrerCount: newCount };
  }
);