/**
 * OutreachPanel — callback and SMS actions for the active/selected farmer.
 * Shown in CallerPanel when a farmer is linked to the call.
 */
import { useState } from 'react';
import { Phone, MessageSquare, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api.js';

const SMS_TEMPLATES = [
  { label: 'Follow-up reminder', text: 'Hello {name}, this is SmartVet calling. Your vet visit is scheduled. Please ensure your birds are accessible. Call us on this number for questions.' },
  { label: 'Treatment reminder',  text: 'Hello {name}, SmartVet reminder: Please continue the prescribed treatment for your flock as advised. Contact us if you notice any changes.' },
  { label: 'Vet visit confirmed', text: 'Hello {name}, your SmartVet vet visit has been confirmed. Our vet will arrive at the scheduled time. Please keep your flock accessible.' },
  { label: 'Emergency follow-up', text: 'Hello {name}, SmartVet is following up on your emergency report. Please call us immediately if your flock condition has worsened.' },
];

function applyTemplate(text, farmerName) {
  return text.replace(/\{name\}/g, farmerName || 'Farmer');
}

export function OutreachPanel({ farmer, activeCall }) {
  const [tab, setTab]           = useState('sms'); // 'call' | 'sms'
  const [message, setMessage]   = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle | dialling | connected | error
  const [smsStatus, setSmsStatus]   = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  const phone = farmer?.phone;
  const name  = farmer?.name || 'Farmer';
  const charCount = message.length;

  async function handleCallback() {
    if (!phone) return;
    setCallStatus('dialling');
    setErrorMsg('');
    try {
      await api.post('/outreach/callback', {
        farmer_id:    farmer.id,
        farmer_phone: phone,
        farmer_name:  name,
      });
      setCallStatus('connected');
    } catch (err) {
      setCallStatus('error');
      setErrorMsg(err.response?.data?.error || 'Call failed');
    }
  }

  async function handleSms() {
    if (!phone || !message.trim()) return;
    setSmsStatus('sending');
    setErrorMsg('');
    try {
      await api.post('/outreach/sms', {
        farmer_phone: phone,
        farmer_name:  name,
        message:      message.trim(),
        call_id:      activeCall?.call_id || null,
      });
      setSmsStatus('sent');
      setTimeout(() => setSmsStatus('idle'), 3000);
    } catch (err) {
      setSmsStatus('error');
      setErrorMsg(err.response?.data?.error || 'SMS failed');
    }
  }

  if (!farmer) return null;

  return (
    <div className="mt-3 border border-sv-border rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-sv-border">
        {[
          { id: 'call', icon: Phone,         label: 'Call back' },
          { id: 'sms',  icon: MessageSquare, label: 'Send SMS'  },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? 'text-sv-green border-b-2 border-sv-green bg-sv-green/5'
                : 'text-sv-text-muted hover:text-white'
            }`}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2.5">
        {/* ── Callback tab ── */}
        {tab === 'call' && (
          <>
            <p className="text-[11px] text-sv-text-muted">
              Initiates an outbound call from SmartVet to <span className="text-white font-semibold">{phone}</span>. The farmer's call will be bridged to you automatically.
            </p>

            {callStatus === 'connected' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-green">
                <CheckCircle size={13} /> Dialling farmer — join the conference in your call panel
              </div>
            )}
            {callStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-red">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleCallback}
              disabled={callStatus === 'dialling' || callStatus === 'connected'}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                         bg-sv-green text-white text-xs font-bold
                         hover:bg-sv-green-d disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {callStatus === 'dialling'
                ? <><Loader2 size={12} className="animate-spin" /> Dialling…</>
                : <><Phone size={12} /> Call {name}</>}
            </button>
          </>
        )}

        {/* ── SMS tab ── */}
        {tab === 'sms' && (
          <>
            {/* Template picker */}
            <div className="border border-sv-border rounded-lg overflow-hidden">
              <button
                onClick={() => setTemplateOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-sv-bg-input text-[11px] text-sv-text-muted hover:text-white transition-colors">
                <span>Templates</span>
                {templateOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {templateOpen && SMS_TEMPLATES.map((t, i) => (
                <button key={i}
                  onClick={() => { setMessage(applyTemplate(t.text, name)); setTemplateOpen(false); }}
                  className="w-full text-left px-2.5 py-2 border-t border-sv-border/50 hover:bg-sv-bg-input transition-colors">
                  <p className="text-[11px] font-semibold text-white">{t.label}</p>
                  <p className="text-[10px] text-sv-text-muted truncate">{applyTemplate(t.text, name)}</p>
                </button>
              ))}
            </div>

            <div>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setSmsStatus('idle'); }}
                placeholder={`Type an SMS to ${name}…`}
                rows={3}
                maxLength={480}
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg px-3 py-2
                           text-xs text-white placeholder-sv-text-muted resize-none
                           focus:outline-none focus:border-sv-green transition-colors"
              />
              <p className={`text-right text-[10px] mt-0.5 ${charCount > 400 ? 'text-sv-amber' : 'text-sv-text-muted'}`}>
                {charCount}/480
              </p>
            </div>

            {smsStatus === 'sent' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-green">
                <CheckCircle size={13} /> SMS sent to {phone}
              </div>
            )}
            {smsStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-red">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleSms}
              disabled={!message.trim() || smsStatus === 'sending' || smsStatus === 'sent'}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                         bg-sv-teal text-white text-xs font-bold
                         hover:bg-sv-teal-d disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {smsStatus === 'sending'
                ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                : smsStatus === 'sent'
                  ? <><CheckCircle size={12} /> Sent</>
                  : <><MessageSquare size={12} /> Send SMS to {name}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
