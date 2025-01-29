// frontend/components/ui/status-badge.tsx
import { cn } from "@/lib/utils"

type StatusType = 'running' | 'restarting' | 'error' | 'down'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig = {
  running: { color: 'bg-green-100 text-green-800', text: 'Rodando' },
  restarting: { color: 'bg-yellow-100 text-yellow-800', text: 'Reiniciando' },
  error: { color: 'bg-red-100 text-red-800', text: 'Erro' },
  down: { color: 'bg-gray-100 text-gray-800', text: 'Desligado' }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.color,
      className
    )}>
      {config.text}
    </span>
  )
}