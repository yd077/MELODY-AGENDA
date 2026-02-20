import { X, Calendar, Clock, MapPin, MessageSquare, ExternalLink, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink: string;
  attendees?: { email: string; displayName?: string; responseStatus: string }[];
}

interface EventDetailsModalProps {
  event: GoogleEvent;
  onClose: () => void;
  phoneNumbers: string[];
}

export function EventDetailsModal({ event, onClose, phoneNumbers }: EventDetailsModalProps) {
  const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
  const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!);
  const isAllDay = !event.start.dateTime;

  // Format time for the SMS (e.g., 14h30)
  const timeString = format(startDate, "H'h'mm", { locale: fr });
  
  // Construct SMS body
  const smsBody = `Bonsoir 😊 
Merci de confirmer votre réservation de demain ${timeString}.
Cordialement 
Melody coiffure 🎀`;

  const encodedSmsBody = encodeURIComponent(smsBody);

  const handleCreateContact = (phone: string) => {
    // Extract name: Remove "Melody Coiffure" and "et"/"and" separators
    let contactName = event.summary || '';
    contactName = contactName
      .replace(/Melody Coiffure/gi, '')
      .replace(/\s+et\s+/gi, '') // Remove " et "
      .replace(/\s+and\s+/gi, '') // Remove " and "
      .replace(/^\s*[-–]\s*/, '') // Remove leading dashes
      .trim();
    
    if (!contactName) contactName = "Client";

    // Create vCard content
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:FB ${contactName}`,
      `TEL;TYPE=CELL:${phone}`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FB_${contactName.replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900 pr-8 leading-snug">
            {event.summary || '(Sans titre)'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Time */}
          <div className="flex gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Date et Heure</h3>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                {format(startDate, 'EEEE d MMMM yyyy', { locale: fr })}
                {!isAllDay && (
                  <>
                    <br />
                    {format(startDate, "H'h'mm", { locale: fr })} - {format(endDate, "H'h'mm", { locale: fr })}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg h-fit">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Lieu</h3>
                <p className="text-sm text-gray-600 mt-1">{event.location}</p>
              </div>
            </div>
          )}

          {/* SMS & Contact Actions */}
          {phoneNumbers.length > 0 && (
            <div className="flex gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg h-fit">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Actions Rapides</h3>
                <div className="mt-2 space-y-2">
                  {phoneNumbers.map((phone, idx) => (
                    <div key={idx} className="flex gap-2">
                      <a
                        href={`sms:${phone}?body=${encodedSmsBody}`}
                        className="flex-1 flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium border border-green-200"
                      >
                        <span>SMS à {phone}</span>
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleCreateContact(phone)}
                        className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                        title={`Créer contact FB pour ${phone}`}
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 italic">
                  Message pré-rempli : "{smsBody.replace(/\n/g, ' ')}"
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-50 text-gray-600 rounded-lg h-fit">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="text-sm font-medium text-gray-900">Description</h3>
                <div 
                  className="text-sm text-gray-600 mt-1 prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: event.description }} 
                />
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
               <h3 className="text-sm font-medium text-gray-900 mb-3">Participants ({event.attendees.length})</h3>
               <div className="space-y-2">
                 {event.attendees.map((attendee, i) => (
                   <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                     <div className={`w-2 h-2 rounded-full ${
                       attendee.responseStatus === 'accepted' ? 'bg-green-500' : 
                       attendee.responseStatus === 'declined' ? 'bg-red-500' : 'bg-gray-300'
                     }`} />
                     <span className="truncate">{attendee.displayName || attendee.email}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
          <a 
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Ouvrir dans Google Agenda
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

