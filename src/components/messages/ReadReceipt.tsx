/**
 * `<ReadReceipt />` — single or double check icon for outgoing messages.
 *
 * - `sent` = single check, muted color (delivered)
 * - `read` = double check, primary color (read by all participants)
 *
 * The shape is built from two `Check` icons from lucide-react-native so
 * we keep the visual weight consistent with the rest of the app.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface ReadReceiptProps {
  status: 'sent' | 'read';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ReadReceipt({
  status,
  size = 12,
  style,
}: ReadReceiptProps): React.JSX.Element {
  const theme = useTheme();
  const color =
    status === 'read' ? theme.colors.primary : theme.colors.textLight;
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      <Check color={color} size={size} strokeWidth={2.5} />
      <View style={{ marginLeft: -size * 0.45 }}>
        <Check color={color} size={size} strokeWidth={2.5} />
      </View>
    </View>
  );
}
