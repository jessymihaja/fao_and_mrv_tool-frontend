// src/components/admin/SelectAvecAjout.tsx
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/client';
import { getErrorMessage } from '@/utils/apiError';

interface Option {
  id: number | string;
  label: string;
}

interface SelectAvecAjoutProps {
  value: number | string | undefined;
  onChange: (value: number | string) => void;
  options: Option[];
  queryKey: string;
  createEndpoint: string;
  idField: string;
  label: string;
  extraField?: { name: string; placeholder: string; label: string };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SelectAvecAjout({
  value,
  onChange,
  options,
  queryKey,
  createEndpoint,
  idField,
  label,
  extraField,
  required = false,
  disabled = false,
  className = '',
}: SelectAvecAjoutProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [designation, setDesignation] = useState('');
  const [extra, setExtra] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) inputRef.current?.focus();
  }, [showForm]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { designation };
      if (extraField) body[extraField.name] = extra;
      const res = await api.post(createEndpoint, body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData([queryKey], (old: unknown) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, data];
      });
      qc.invalidateQueries({ queryKey: [queryKey] });

      const newId = data[idField];
      if (newId !== undefined) onChange(newId);

      toast.success(`"${designation}" ajouté avec succès`);
      setDesignation('');
      setExtra('');
      setShowForm(false);
    },
    onError: (err) => {
      const msg = getErrorMessage(err, 'Erreur lors de la création');
      toast.error(msg);
    },
  });

  const handleAjouter = () => {
    if (!designation.trim()) {
      toast.error('La désignation est obligatoire');
      return;
    }
    mutation.mutate();
  };

  const handleCancel = () => {
    setShowForm(false);
    setDesignation('');
    setExtra('');
  };

  const stopEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAjouter();
    }
  };

  return (
    <div className={className}>
      <label className="form-label">
        {label}{required && ' *'}
      </label>

      {!showForm ? (
        <div className="flex gap-2 items-center">
          <select
            className="form-input flex-1"
            required={required}
            disabled={disabled}
            value={value ?? ''}
            title={label}
            onChange={e => {
              const v = e.target.value;
              onChange(v === '' ? '' : isNaN(Number(v)) ? v : Number(v));
            }}
          >
            <option value="" disabled>Sélectionner…</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>

          <button
            type="button"
            title="Ajouter une option manquante"
            disabled={disabled}
            onClick={() => setShowForm(true)}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-dashed border-green-400 text-green-600 hover:bg-green-50 hover:border-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-semibold text-green-700">
            ➕ Ajouter une nouvelle option pour « {label} »
          </p>

          {extraField ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-green-600 uppercase tracking-wide block mb-1">
                  {extraField.label}
                </label>
                <input
                  type="text"
                  placeholder={extraField.placeholder}
                  value={extra}
                  onChange={e => setExtra(e.target.value)}
                  onKeyDown={stopEnter}
                  className="form-input w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-green-600 uppercase tracking-wide block mb-1">
                  Désignation <span className="text-red-400 normal-case">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nom complet de l'entité..."
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  onKeyDown={stopEnter}
                  className="form-input w-full"
                />
              </div>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder="Nouvelle désignation *"
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              onKeyDown={stopEnter}
              className="form-input"
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending || !designation.trim()}
              onClick={handleAjouter}
              className="btn btn-primary btn-sm flex-1"
            >
              {mutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ajout…</>
                : <><Check className="w-3.5 h-3.5" /> Ajouter</>
              }
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={mutation.isPending}
              className="btn btn-secondary btn-sm"
            >
              <X className="w-3.5 h-3.5" /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
