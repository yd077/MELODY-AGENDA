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
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                    {event.summary || '(No Title)'}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap capitalize">{format(startDate, 'd MMM yyyy', { locale: fr })}</span>
                    </div>
                    
                    {!isAllDay && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{format(startDate, "H'h'mm", { locale: fr })}</span>
                      </div>
                    )}
                    
                    {event.location && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {hasPhone && (
                    <div 
                      className="p-2 bg-green-50 text-green-600 rounded-full"
                      title="Phone number detected"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
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

