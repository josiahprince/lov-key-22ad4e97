import { format, isToday, isYesterday } from 'date-fns';

// The minimum a message needs for grouping. Kept structural rather than
// importing the hook's Message type so this stays a leaf module with no
// dependency back on hooks.
export interface GroupableMessage {
  id: string;
  sender_id: string;
  created_at: string;
}

export type ChatItem<T extends GroupableMessage> =
  | { type: 'date'; id: string; label: string }
  | { type: 'group'; id: string; isOwn: boolean; messages: T[] };

const dateLabel = (iso: string) => {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

// Groups consecutive messages from the same sender together, with date
// dividers inserted wherever the calendar day changes - the layout other
// messaging/dating apps use so a run of bubbles reads as one "turn".
// A day change always starts a new group, even if the same person sent both.
export const groupMessagesIntoChatItems = <T extends GroupableMessage>(
  messages: T[],
  currentUserId: string | undefined
): ChatItem<T>[] => {
  const items: ChatItem<T>[] = [];
  let lastDateKey: string | null = null;
  let currentGroup: T[] | null = null;
  let currentSenderId: string | null = null;

  const flushGroup = () => {
    if (currentGroup && currentGroup.length > 0) {
      items.push({
        type: 'group',
        id: currentGroup[0].id,
        isOwn: currentSenderId === currentUserId,
        messages: currentGroup,
      });
    }
    currentGroup = null;
  };

  messages.forEach((message) => {
    const dateKey = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (dateKey !== lastDateKey) {
      flushGroup();
      currentSenderId = null;
      items.push({ type: 'date', id: `date-${dateKey}`, label: dateLabel(message.created_at) });
      lastDateKey = dateKey;
    }

    if (message.sender_id === currentSenderId && currentGroup) {
      currentGroup.push(message);
    } else {
      flushGroup();
      currentGroup = [message];
      currentSenderId = message.sender_id;
    }
  });
  flushGroup();

  return items;
};
