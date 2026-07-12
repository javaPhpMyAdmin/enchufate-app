/**
 * DeleteConfirmModal — wraps the `Modal` primitive in the standard
 * "are you sure?" copy for removing a charger.
 *
 * Cancel and the backdrop close the modal without action. Confirm fires
 * `onConfirm`, after which the caller is expected to also close the
 * modal (the parent already knows what "deleted" looks like).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Modal } from '@/components/ui';
import { useTheme } from '@/theme';

export interface DeleteConfirmModalProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Optional title override (defaults to "Eliminar cargador"). */
  title?: string;
  /** Optional body override. */
  message?: string;
}

export const DeleteConfirmModal = React.memo(function DeleteConfirmModal({
  visible,
  loading = false,
  onCancel,
  onConfirm,
  title = 'Eliminar cargador',
  message = '¿Eliminar este cargador? Esta acción no se puede deshacer.',
}: DeleteConfirmModalProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      onRequestClose={onCancel}
      testID="delete-confirm-modal"
    >
      <View style={styles.header}>
        <Text
          style={[theme.typography.h3, { color: theme.colors.text }]}
        >
          {title}
        </Text>
      </View>
      <Text
        style={[
          theme.typography.body,
          { color: theme.colors.textMuted, marginTop: 8 },
        ]}
      >
        {message}
      </Text>
      <View style={styles.actions}>
        <View style={styles.actionWrap}>
          <Button
            label="Cancelar"
            variant="ghost"
            size="md"
            onPress={onCancel}
            disabled={loading}
            fullWidth
          />
        </View>
        <View style={styles.actionWrap}>
          <Button
            label="Eliminar"
            variant="primary"
            size="md"
            onPress={onConfirm}
            loading={loading}
            style={{ backgroundColor: theme.colors.danger }}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionWrap: {
    flex: 1,
  },
});
