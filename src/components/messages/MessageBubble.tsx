/**
 * `<MessageBubble />` — single bubble (incoming or outgoing) with
 * optional timestamp and read receipt.
 *
 * Layout matches the WhatsApp convention:
 *   - incoming:  left-aligned, surface background, dark text, with a
 *                smaller top-left corner radius
 *   - outgoing:  right-aligned, primary background, white text, with a
 *                smaller top-right corner radius
 *
 * The timestamp + read-receipt sit below the bubble in a small
 * caption row. For incoming bubbles the row is omitted (the timestamp
 * is shown on the last message of a cluster only, when relevant).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { Message } from '@/data/types';

import { ReadReceipt, type ReadReceiptProps } from './ReadReceipt';

export interface MessageBubbleProps {
  message: Pick<Message, 'id' | 'body' | 'authorId' | 'createdAt'>;
  isOutgoing: boolean;
  /** Show the timestamp + receipt row below the bubble. */
  showMeta?: boolean;
  readReceipt?: ReadReceiptProps['status'];
}

export function MessageBubble({
  message,
  isOutgoing,
  showMeta = true,
  readReceipt,
}: MessageBubbleProps): React.JSX.Element {
  const theme = useTheme();
  const bubbleStyle = isOutgoing
    ? {
        backgroundColor: theme.colors.primary,
        borderTopRightRadius: 4,
      }
    : {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
      };
  const textColor = isOutgoing
    ? theme.colors.textOnPrimary
    : theme.colors.text;
  const timeColor = isOutgoing
    ? 'rgba(255, 255, 255, 0.85)'
    : theme.colors.textLight;

  return (
    <View
      style={[
        styles.row,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
      ]}
    >
      <View
        style={[
          styles.bubble,
          { borderRadius: 16 },
          bubbleStyle,
        ]}
        accessibilityRole="text"
        accessibilityLabel={message.body}
      >
        <Text
          style={[
            theme.typography.body,
            { color: textColor },
          ]}
        >
          {message.body}
        </Text>
      </View>
      {showMeta ? (
        <View
          style={[
            styles.meta,
            isOutgoing ? styles.metaOutgoing : styles.metaIncoming,
          ]}
        >
          <Text
            style={[
              theme.typography.micro,
              { color: timeColor },
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isOutgoing && readReceipt ? (
            <View style={styles.receiptWrap}>
              <ReadReceipt status={readReceipt} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 4,
  },
  metaIncoming: {
    justifyContent: 'flex-start',
  },
  metaOutgoing: {
    justifyContent: 'flex-end',
  },
  receiptWrap: {
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
