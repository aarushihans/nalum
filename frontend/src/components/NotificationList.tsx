import { useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { Loader2, CheckCheck, Inbox, Users, GraduationCap } from 'lucide-react';

interface NotificationListProps {
  onClose: () => void;
}

export const NotificationList = ({ onClose }: NotificationListProps) => {
  const {
    notifications,
    loading,
    unreadCount,
    markAllAsRead
  } = useNotifications();

  // Group connection requests by requester role
  const { alumniRequests, studentRequests, otherNotifications } = useMemo(() => {
    const alumni: typeof notifications = [];
    const student: typeof notifications = [];
    const other: typeof notifications = [];

    for (const n of notifications) {
      if (n.type === 'connection_request' && n.metadata?.requesterRole === 'alumni') {
        alumni.push(n);
      } else if (n.type === 'connection_request' && n.metadata?.requesterRole === 'student') {
        student.push(n);
      } else {
        other.push(n);
      }
    }

    return { alumniRequests: alumni, studentRequests: student, otherNotifications: other };
  }, [notifications]);

  const hasConnectionRequests = alumniRequests.length > 0 || studentRequests.length > 0;

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div>
            {/* Alumni Connection Requests Section */}
            {alumniRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    Alumni Connection Requests
                  </span>
                  <span className="ml-auto text-xs text-amber-400/70 font-medium">
                    {alumniRequests.length}
                  </span>
                </div>
                <div className="divide-y">
                  {alumniRequests.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Student Connection Requests Section */}
            {studentRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                    Student Connection Requests
                  </span>
                  <span className="ml-auto text-xs text-blue-400/70 font-medium">
                    {studentRequests.length}
                  </span>
                </div>
                <div className="divide-y">
                  {studentRequests.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Notifications */}
            {otherNotifications.length > 0 && (
              <div>
                {hasConnectionRequests && (
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Other Notifications
                    </span>
                    <span className="ml-auto text-xs text-gray-500 font-medium">
                      {otherNotifications.length}
                    </span>
                  </div>
                )}
                <div className="divide-y">
                  {otherNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
