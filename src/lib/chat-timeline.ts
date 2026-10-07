type TimelineMessage = { id: string; sender: string; text: string; commerce?: unknown };

// Keep client-side cards between their surrounding messages when server history
// arrives. Match backwards so repeated messages retain their latest occurrence.
export function mergeChatTimeline<T extends TimelineMessage>(history: T[], local: T[]): T[] {
  const matches = new Map<number, number>();
  let remoteIndex = history.length - 1;
  for (let index = local.length - 1; index >= 0; index--) {
    const message = local[index];
    if (message.commerce) continue;
    for (let candidate = remoteIndex; candidate >= 0; candidate--) {
      if (history[candidate].sender === message.sender && history[candidate].text === message.text) {
        matches.set(index, candidate);
        remoteIndex = candidate - 1;
        break;
      }
    }
  }
  const merged = [...history];
  const cards = new Map<number, T[]>();
  let anchor = -1;
  local.forEach((message, index) => {
    const match = matches.get(index);
    if (match !== undefined) {
      anchor = match;
      merged[match] = { ...message, ...history[match], id: message.id };
    } else if (message.commerce) {
      cards.set(anchor, [...(cards.get(anchor) || []), message]);
    }
  });
  return [...(cards.get(-1) || []), ...merged.flatMap((message, index) => [message, ...(cards.get(index) || [])])];
}
