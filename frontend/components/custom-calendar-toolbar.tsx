/**
 * Custom Calendar Toolbar
 * Replaces the default toolbar to allow for custom styling and formatting
 */

import { ToolbarProps, View, Event } from 'react-big-calendar';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CustomCalendarToolbar<TEvent extends Event>({
  date,
  view,
  onNavigate,
  onView,
}: ToolbarProps<TEvent>) {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
          Dnes
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-bold capitalize">
          {format(date, 'LLLL yyyy', { locale: cs })}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {(['month', 'week', 'day', 'agenda'] as View[]).map((viewName) => (
          <Button
            key={viewName}
            variant={view === viewName ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView(viewName)}
            className="capitalize"
          >
            {viewName === 'month' && 'Měsíc'}
            {viewName === 'week' && 'Týden'}
            {viewName === 'day' && 'Den'}
            {viewName === 'agenda' && 'Agenda'}
          </Button>
        ))}
      </div>
    </div>
  );
}
