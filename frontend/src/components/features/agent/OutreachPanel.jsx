import { useState } from 'react';
import { Phone, MessageSquare, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api.js';

const FARMER_TEMPLATES = [
  { label: 'Vaccination reminder',  text: 'Hello {name}, this is SmartVet. Your flock is due for vaccination soon. Please call us or visit your nearest vet to schedule. Thank you.' },
  { label: 'Treatment follow-up',   text: 'Hello {name}, SmartVet is following up on your recent treatment. Please let us know how your flock is doing. Call us anytime.' },
  { label: 'Vet visit reminder',    text: 'Hello {name}, your scheduled vet visit is coming up. Our vet will contact you to confirm the time. Please ensure your flock is accessible.' },
  { label: 'Health check reminder', text: 'Hello {name}, SmartVet recommends a routine health check for your flock. Please call us to book a free consultation.' },
  { label: 'Emergency follow-up',   text: 'Hello {name}, SmartVet is checking in after your recent emergency report. Please call us immediately if your flock condition has worsened.' },
];

const VET_TEMPLATES = [
  { label: 'Dispatch assignment',   text: 'Hello {name}, you have been assigned a new farm visit on SmartVet. Please check your dispatch details and confirm availability.' },
  { label: 'Urgent visit request',  text: 'Hello {name}, there is an urgent farm visit request on SmartVet requiring your attention. Please call us back as soon as possible.' },
  { label: 'Schedule confirmation', text: 'Hello {name}, SmartVet is confirming your scheduled visit. Please call us if you need to reschedule.' },
  { label: 'Availability check',    text: 'Hello {name}, SmartVet is checking your availability for an upcoming farm visit. Please reply or call us to confirm.' },
  { label: 'Training reminder',     text: 'Hello {name}, this is a reminder from SmartVet about your upcoming training session. Please contact us for details.' },
];

function applyTemplate(text, farmerName) {
  return text.replace(/\{name\}/g, farmerName || 'Farmer');
}

export function OutreachPanel({ farmer, activeCall, recipientType = 'farmer' }) {
  const SMS_TEMPLATES = recipientType === 'vet' ? VET_TEMPLATES : FARMER_TEMPLATES;
  const [tab, setTab]           = useState('sms');
  const [message, setMessage]   = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [smsStatus,  setSmsStatus]  = useState('idle');
  const [errorMsg,   setErrorMsg]   = useState('');

  const phone = farmer?.phone;
  const name  = farmer?.name || 'Farmer';

  async function handleCall() {
    if (!phone) return;
    setCallStatus('dialling');
    setErrorMsg('');
    try {
      await api.post('/outreach/callback', { farmer_id: farmer.id || null, farmer_phone: phone, farmer_name: name });
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
      await api.post('/outreach/sms', { farmer_phone: phone, farmer_name: name, message: message.trim(), call_id: activeCall?.call_id || null });
      setSmsStatus('sent');
      setTimeout(() => { setSmsStatus('idle'); setMessage(''); }, 4000);
    } catch (err) {
      setSmsStatus('error');
      setErrorMsg(err.response?.data?.error || 'SMS failed to send');
    }
  }

  if (!phone) return null;

  const tabLabel = recipientType === 'vet' ? 'Contact Vet' : 'Contact Farmer';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mt-3">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{tabLabel}</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {[
          { id: 'call', icon: Phone,         label: 'Call'     },
          { id: 'sms',  icon: MessageSquare, label: 'Send SMS' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => { setTab(id); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3 bg-white">

        {tab === 'call' && (
          <>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Initiates an outbound call to <span className="font-semibold text-gray-800">{name}</span> at <span className="font-mono text-gray-800">{phone}</span>.
            </p>

            {callStatus === 'done' && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> Dialling {name} — you will be connected shortly
              </div>
            )}
            {callStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button onClick={handleCall} disabled={callStatus === 'dialling' || callStatus === 'done'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 disabled:opacity-50 transition-colors">
              {callStatus === 'dialling'
                ? <><Loader2 size={12} className="animate-spin" /> Dialling…</>
                : callStatus === 'done'
                  ? <><CheckCircle size={12} /> Connected</>
                  : <><Phone size={12} /> Call {name}</>}
            </button>

            {callStatus === 'done' && (
              <button onClick={() => setCallStatus('idle')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 text-center transition-colors">
                Make another call
              </button>
            )}
          </>
        )}

        {tab === 'sms' && (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setTemplateOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-2 bg-gray-50 text-[11px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
                <span>Pick a reminder template…</span>
                {templateOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {templateOpen && (
                <div className="divide-y divide-gray-100">
                  {SMS_TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => { setMessage(applyTemplate(t.text, name)); setTemplateOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors">
                      <p className="text-[11px] font-semibold text-gray-800">{t.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{applyTemplate(t.text, name)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <textarea value={message} onChange={e => { setMessage(e.target.value); setSmsStatus('idle'); }}
                placeholder={`Type a message to ${name}…`} rows={3} maxLength={480}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-green-600 transition-colors" />
              <p className={`text-right text-[10px] mt-0.5 ${message.length > 400 ? 'text-amber-600' : 'text-gray-400'}`}>
                {message.length}/480
              </p>
            </div>

            {smsStatus === 'sent' && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> SMS sent to {name} at {phone}
              </div>
            )}
            {smsStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <XCircle size={13} /> {errorMsg}
              </div>
            )}

            <button onClick={handleSms} disabled={!message.trim() || smsStatus === 'sending' || smsStatus === 'sent'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 disabled:opacity-50 transition-colors">
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
