/**
 * WriteReview — modal screen for writing a review after a charging session.
 *
 * Route params:
 *   - targetUserId: the host being reviewed
 *   - chargerId: the charger used
 *   - sessionId?: optional session reference
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarRating } from '@/components/reviews/StarRating';
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useCreateReview } from '@/hooks/useReviewsQuery';
import { useTheme } from '@/theme';

export default function WriteReviewScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { targetUserId, chargerId, sessionId } = useLocalSearchParams<{
    targetUserId: string;
    chargerId: string;
    sessionId?: string;
  }>();
  const { session } = useAuth();
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async (): Promise<void> => {
    if (rating === 0) {
      Alert.alert('Seleccioná una calificación', 'Tocá las estrellas para puntuar.');
      return;
    }
    if (!session?.user) return;

    const result = await createReview.mutateAsync({
      authorId: session.user.id,
      targetUserId: targetUserId!,
      chargerId: chargerId!,
      sessionId: sessionId,
      rating,
      comment: comment.trim(),
    });

    if (result) {
      Alert.alert('¡Gracias!', 'Tu reseña fue publicada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', 'No se pudo publicar la reseña. Intentá de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[
            theme.typography.h2,
            { color: theme.colors.text, marginBottom: 24 },
          ]}
        >
          Calificá tu experiencia
        </Text>

        <View style={styles.starsRow}>
          <StarRating value={rating} onChange={setRating} size={40} />
        </View>

        <Text
          style={[
            theme.typography.bodyBold,
            { color: theme.colors.text, marginTop: 24, marginBottom: 8 },
          ]}
        >
          ¿Qué te pareció?
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Contanos cómo fue tu carga..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={comment}
          onChangeText={setComment}
          maxLength={500}
        />
        <Text
          style={[
            theme.typography.caption,
            {
              color: theme.colors.textMuted,
              textAlign: 'right',
              marginTop: 4,
            },
          ]}
        >
          {comment.length}/500
        </Text>

        <Button
          label={createReview.isPending ? 'Publicando...' : 'Publicar reseña'}
          onPress={handleSubmit}
          disabled={createReview.isPending || rating === 0}
          loading={createReview.isPending}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  starsRow: {
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
  },
});
