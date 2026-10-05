import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConnectionState } from '../scheduler/types';
import { SpinIcon } from './SpinIcon';
import { StatusChip } from './StatusChip';

interface ConnectionBadgeProps {
  connection: ConnectionState;
  online: boolean;
}

/** Connection loss is a connection state, never a failed job. Nothing is shown while connected. */
export function ConnectionBadge({ connection, online }: ConnectionBadgeProps) {
  const { t } = useTranslation('studio');
  if (!online) {
    return (
      <StatusChip tone="warning" icon={<WifiOff size={12} aria-hidden="true" />}>
        {t('connection.offline')}
      </StatusChip>
    );
  }
  if (connection === 'reconnecting') {
    return (
      <StatusChip tone="warning" icon={<SpinIcon size={12} />}>
        {t('connection.reconnecting')}
      </StatusChip>
    );
  }
  if (connection === 'offline') {
    return (
      <StatusChip tone="warning" icon={<WifiOff size={12} aria-hidden="true" />}>
        {t('connection.unavailable')}
      </StatusChip>
    );
  }
  return null;
}
