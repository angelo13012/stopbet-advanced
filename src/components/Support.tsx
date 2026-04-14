import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User, Mail, MessageCircle, ChevronRight, Phone } from 'lucide-react';

const FAQ_RESPONSES: Record<string, string> = {
  "paiement": "Pour tout problème de paiement, vérifiez d'abord que votre carte est valide. Si le problème persiste, utilisez le formulaire ci-dessous pour nous contacter. Nous répondons sous 24h.",
  "annuler": "Pour annuler votre abonnement Premium, allez dans Profil → Abonnement. L'annulation prend effet à la fin de la période en cours. Vous ne serez pas débité à nouveau.",
  "remboursement": "Les remboursements sont traités sous 5 à 7 jours ouvrés. Contactez-nous via le formulaire ci-dessous avec votre email de compte et la date du paiement.",
  "bug": "Désolé pour ce désagrément ! Décrivez le bug dans le formulaire ci-dessous avec le maximum de détails (écran concerné, message d'erreur). Nous corrigerons au plus vite.",
  "compte": "Pour tout problème de connexion, essayez de réinitialiser votre mot de passe depuis l'écran de connexion. Si le problème persiste, contactez-nous.",
  "supprimer": "Pour supprimer votre compte et toutes vos données, contactez-nous via le formulaire ci-dessous. La suppression est définitive et effectuée sous 48h conformément au RGPD.",
  "premium": "L'abonnement Premium coûte 3,49€/mois ou 29,99€/an. Il inclut le coach IA 24/7, l'auto-exclusion des plateformes, les alertes budget et les statistiques avancées.",
  "données": "Vos données sont stockées de manière sécurisée et chiffrée. Nous ne vendons jamais vos données. Vous pouvez demander leur suppression à tout moment (RGPD).",
  "sos": "Le mode SOS est accessible depuis le bouton rouge en haut de l'écran. Il vous propose une respiration guidée, vos contacts d'urgence et le numéro de Joueurs Info Service.",
};

function findResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return "Je n'ai pas trouvé de réponse à votre question. Utilisez le formulaire ci-dessous pour contacter notre équipe, nous vous répondrons sous 24h.";
}

interface ChatMsg {
  id: string;
  from: 'user' | 'bot';
  text: string;
}

export default function Support({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'chat' | 'form'>('chat');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: '0', from: 'bot', text: "Bonjour ! Je suis l'assistant StopBet. Posez-moi votre question (paiement, bug, abonnement, compte, données...) et j'essaierai de vous aider." }
  ]);
  const [input, setInput] = useState('');
  const [formData, setFormData] = useState({ email: '', subject: '', message: '' });
  const [formSent, setFormSent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const sendMsg = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, from: 'user', text: input.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const response = findResponse(userMsg.text);
      const botMsg: ChatMsg = { id: `b-${Date.now()}`, from: 'bot', text: response };
      setMsgs(prev => [...prev, botMsg]);
    }, 800);
  };

  const sendForm = () => {
    if (!formData.email || !formData.message) return;
    setFormSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-900">Support</h2>
          <p className="text-xs text-slate-400 font-medium">Aide & contact</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4">
        <button onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
            tab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-100'
          }`}>
          <Bot size={18} /> Chatbot
        </button>
        <button onClick={() => setTab('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
            tab === 'form' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-100'
          }`}>
          <Mail size={18} /> Nous contacter
        </button>
      </div>

      {tab === 'chat' ? (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md'
                }`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["Paiement", "Bug", "Premium", "Annuler", "Données"].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-500 whitespace-nowrap hover:border-indigo-200 hover:text-indigo-600 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Posez votre question..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={sendMsg}
              className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {formSent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Message envoyé !</h3>
              <p className="text-sm text-slate-500">Nous vous répondrons sous 24h à l'adresse {formData.email}</p>
              <button onClick={onBack}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm">
                Retour à l'app
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-black text-slate-900">Envoyez-nous un message</h3>
                <p className="text-xs text-slate-400">Nous répondons sous 24h, du lundi au vendredi.</p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Votre email</label>
                  <input type="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Sujet</label>
                  <select value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option value="">Choisir un sujet</option>
                    <option value="paiement">Problème de paiement</option>
                    <option value="bug">Signaler un bug</option>
                    <option value="compte">Problème de compte</option>
                    <option value="abonnement">Question abonnement</option>
                    <option value="donnees">Mes données (RGPD)</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Message</label>
                  <textarea value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Décrivez votre problème en détail..."
                    rows={5}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>

                <button onClick={sendForm}
                  disabled={!formData.email || !formData.message}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  <Send size={18} /> Envoyer
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100">
                <h4 className="font-black text-slate-900 text-sm mb-3">Autres moyens de contact</h4>
                <a href="mailto:contact@stopbet.fr"
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2 hover:bg-indigo-50 transition-colors">
                  <Mail size={18} className="text-indigo-600" />
                  <span className="text-sm font-bold text-slate-700">contact@stopbet.fr</span>
                </a>
                <a href="tel:0974751313"
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-red-50 transition-colors">
                  <Phone size={18} className="text-red-500" />
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">Joueurs Info Service</span>
                    <span className="text-xs text-slate-400">09 74 75 13 13 — Gratuit et confidentiel</span>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}