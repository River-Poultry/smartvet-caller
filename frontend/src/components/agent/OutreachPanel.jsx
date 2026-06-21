/**
 * OutreachPanel — agent initiates a call or sends an SMS to a farmer.
 * Used from the Farmers list (proactive outreach / reminders) and
 * from CallerPanel during an active inbound call.
 */
import { useState } from 'react';
import { Phone, MessageSquare, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api.js';

const SMS_TEMPLATES = [
  {
    label: 'Vaccination reminder',
    text: 'Hello {name}, this is SmartVet. Your flock is due for vaccination soon. Please call us on this number or visit your nearest vet to schedule. Thank you.',
  },
  {
    label: 'Treatment follow-up',
    text: 'Hello {name}, SmartVet is following up on your recent treatment. Please let us know how your flock is doing. Call us anytime on this number.',
  },
  {
    label: 'Vet visit reminder',
    text: 'Hello {name}, your scheduled vet visit is coming up. Our vet will contact you to confirm the time. Please ensure your flock is accessible.',
  },
  {
    label: 'Health check reminder',
    text: 'Hello {name}, SmartVet recommends a routine health check for your flock. Please call us to book a free consultation with one of our vets.',
  },
  {
    label: 'Emergency follow-up',
    text: 'Hello {name}, SmartVet is checking in after your recent emergency report. Please call us immediately if your flock condition has worsened.',
  },
];

function applyTemplate(text, farmerName) {
  return text.replace(/\{name\}/g, farmerName || 'Farmer');
}

export function OutreachPanel({ farmer, activeCall }) {
  const [tab, setTab]         = useState('sms');
  const [message, setMessage] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  const [callStatus, setCallStatus] = useState('idle'); // idle | dialling | done | error
  const [smsStatus,  setSmsStatus]  = useState('idle'); // idle | sending | sent | error
  const [errorMsg,   setErrorMsg]   = useState('');

  const phone = farmer?.phone;
  const name  = farmer?.name || 'Farmer';

  async function handleCall() {
    if (!phone) return;
    setCallStatus('dialling');
    setErrorMsg('');
    try {
      await api.post('/outreach/callback', {
        farmer_id:    farmer.id || null,
        farmer_phone: phone,
        farmer_name:  name,
      });
      setCallStatus('done');
    } catch (err) {
      setCallStatus('error');
      setErrorMsg(err.response?.data?.error || 'Call could not be initiated');
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
      setTimeout(() => { setSmsStatus('idle'); setMessage(''); }, 4000);
    } catch (err) {
      setSmsStatus('error');
      setErrorMsg(err.response?.data?.error || 'SMS failed to send');
    }
  }

  if (!phone) return null;

  return (
    <div className="border border-sv-border rounded-xl overflow-hidden mt-3">
      {/* Section label */}
      <div className="px-3 py-2 bg-sv-bg-input border-b border-sv-border">
        <p className="text-[11px] font-bold text-sv-text-muted uppercase tracking-widest">Contact Farmer</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sv-border">
        {[
          { id: 'call', icon: Phone,         label: 'Call'     },
          { id: 'sms',  icon: MessageSquare, label: 'Send SMS' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => { setTab(id); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? 'text-sv-green border-b-2 border-sv-green bg-sv-green/5'
                : 'text-sv-text-muted hover:text-white'
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">

        {/* ── Call tab ── */}
        {tab === 'call' && (
          <>
            <p className="text-[11px] text-sv-text-muted leading-relaxed">
              Initiates an outbound call to <span className="font-semibold text-white">{name}</span> at <span className="font-mono text-white">{phone}</span>. The system will dial the farmer and connect them to you.
            </p>

            {callStatus === 'done' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-green bg-sv-green/10 border border-sv-green/30 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> Dialling {name} — you will be connected shortly
              </div>
            )}
            {callStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-red bg-sv-red/10 border border-sv-red/30 rounded-lg px-3 py-2">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleCall}
              disabled={callStatus === 'dialling' || callStatus === 'done'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                         bg-sv-green text-white text-xs font-bold
                         hover:bg-sv-green-d disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {callStatus === 'dialling'
                ? <><Loader2 size={12} className="animate-spin" /> Dialling…</>
                : callStatus === 'done'
                  ? <><CheckCircle size={12} /> Connected</>
                  : <><Phone size={12} /> Call {name}</>}
            </button>

            {callStatus === 'done' && (
              <button onClick={() => setCallStatus('idle')}
                className="w-full text-xs text-sv-text-muted hover:text-white transition-colors py-1 text-center">
                Make another call
              </button>
            )}
          </>
        )}

        {/* ── SMS tab ── */}
        {tab === 'sms' && (
          <>
            {/* Template picker */}
            <div className="border border-sv-border rounded-lg overflow-hidden">
              <button
                onClick={() => setTemplateOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-2 bg-sv-bg-input text-[11px] text-sv-text-muted hover:text-white transition-colors">
                <span>Pick a reminder template…</span>
                {templateOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {templateOpen && (
                <div className="divide-y divide-sv-border/50">
                  {SMS_TEMPLATES.map((t, i) => (
                    <button key={i}
                      onClick={() => { setMessage(applyTemplate(t.text, name)); setTemplateOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-sv-bg-input transition-colors">
                      <p className="text-[11px] font-semibold text-white">{t.label}</p>
                      <p className="text-[10px] text-sv-text-muted mt-0.5 line-clamp-2">{applyTemplate(t.text, name)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setSmsStatus('idle'); }}
                placeholder={`Type a message to ${name}…`}
                rows={3}
                maxLength={480}
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg px-3 py-2
                           text-xs text-white placeholder-sv-text-muted resize-none
                           focus:outline-none focus:border-sv-green transition-colors"
              />
              <p className={`text-right text-[10px] mt-0.5 ${message.length > 400 ? 'text-sv-amber' : 'text-sv-text-muted'}`}>
                {message.length}/480
              </p>
            </div>

            {smsStatus === 'sent' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-green bg-sv-green/10 border border-sv-green/30 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> SMS sent to {name} at {phone}
              </div>
            )}
            {smsStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-sv-red bg-sv-red/10 border border-sv-red/30 rounded-lg px-3 py-2">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleSms}
              disabled={!message.trim() || smsStatus === 'sending' || smsStatus === 'sent'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
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
