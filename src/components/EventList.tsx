import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, MessageSquare, ChevronRight } from 'lucide-react';
import { EventDetailsModal } from './EventDetailsModal';

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

interface EventListProps {
  events: GoogleEvent[];
}

export function EventList({ events }: EventListProps) {
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);

  // Helper to extract phone numbers from text
  const extractPhoneNumbers = (text?: string): string[] => {
    if (!text) return [];
    // Matches:
    // +33 6 12 34 56 78 (International FR)
    // 06 12 34 56 78 (Local FR)
    // +1-555-555-5555 (US)
    // 555-555-5555 (US Local)
    // Generic 10+ digits
    const regex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}|(?:\+1\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const matches = text.match(regex);
    return matches ? [...new Set(matches)] : []; // Deduplicate
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No upcoming events found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => {
          const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
          const isAllDay = !event.start.dateTime;
          
          // Check for phone numbers in description and location
          const phoneNumbers = [
            ...extractPhoneNumbers(event.description),
            ...extractPhoneNumbers(event.location)
          ];
          const hasPhone = phoneNumbers.length > 0;

          return (
            <div 
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md hover:border-stone-200 transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Decorative accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pl-2">
                  <h3 className="text-lg font-semibold text-stone-900 mb-2 truncate group-hover:text-stone-700 transition-colors font-display">
                    {event.summary || '(Sans titre)'}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-stone-500">
                    <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-md">
                      <Calendar className="w-4 h-4 shrink-0 text-stone-400" />
                      <span className="whitespace-nowrap capitalize font-medium">{format(startDate, 'd MMM yyyy', { locale: fr })}</span>
                    </div>
                    
                    {!isAllDay && (
                      <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-md">
                        <Clock className="w-4 h-4 shrink-0 text-stone-400" />
                        <span className="whitespace-nowrap font-medium">{format(startDate, "H'h'mm", { locale: fr })}</span>
                      </div>
                    )}
                    
                    {event.location && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0 text-stone-400" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4 self-center">
                  {hasPhone && (
                    <div 
                      className="p-2.5 bg-green-50 text-green-700 rounded-full shadow-sm"
                      title="Numéro détecté"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  )}
                  <div className="p-2 rounded-full text-stone-300 group-hover:text-stone-900 group-hover:bg-stone-100 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)}
          phoneNumbers={[
            ...extractPhoneNumbers(selectedEvent.description),
            ...extractPhoneNumbers(selectedEvent.location)
          ]}
        />
      )}
    </>
  );
}

