import React from 'react';
import { Calendar } from 'lucide-react-native';

import { EmptyState, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function BookingsScreen(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Screen scroll={false}>
      <EmptyState
        icon={<Calendar color={theme.colors.textMuted} size={36} />}
        title="Tus reservas van a aparecer acá"
        message="Reservá un cargador desde el mapa y gestioná tus slots desde este tab."
      />
    </Screen>
  );
}
