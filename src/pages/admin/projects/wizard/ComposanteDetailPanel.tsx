// src/pages/admin/projects/wizard/ComposanteDetailPanel.tsx
import { useState } from 'react';
import { ArrowLeft, Info, ListChecks, Target, Paperclip } from 'lucide-react';
import type { Composante } from '@/types';
import ActivitesPanel from './ActivitesPanel';
import IndicateursPanel from './IndicateursPanel';
import DocumentsPanel from './DocumentsPanel';
import ComposanteInfoForm from './ComposanteInfoForm';

interface Props {
  composante: Composante;
  onBack: () => void;
  onUpdated: (c: Composante) => void;
  canWrite?: boolean;
}

type SubTab = 'infos' | 'activites' | 'indicateurs' | 'documents';

const TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: 'infos',       label: 'Informations générales', icon: Info },
  { key: 'activites',   label: 'Activités de la composante',               icon: ListChecks },
  { key: 'indicateurs', label: 'Indicateurs de la composante', icon: Target },
  { key: 'documents',   label: 'Documents de la composante',                icon: Paperclip },
];

export default function ComposanteDetailPanel({ composante, onBack, onUpdated, canWrite = true }: Props) {
  const [tab, setTab] = useState<SubTab>('infos');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <p className="text-xs text-gray-400">Composante</p>
          <h3 className="font-bold text-gray-800">{composante.nom}</h3>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {tab === 'infos'       && <ComposanteInfoForm composante={composante} onSaved={onUpdated} canWrite={canWrite} />}
        {tab === 'activites'   && <ActivitesPanel composanteId={composante.id} canWrite={canWrite} />}
        {tab === 'indicateurs' && <IndicateursPanel composanteId={composante.id} canWrite={canWrite} />}
        {tab === 'documents'   && <DocumentsPanel composanteId={composante.id} canWrite={canWrite} />}
      </div>
    </div>
  );
}
