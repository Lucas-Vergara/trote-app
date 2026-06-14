import React, { useState, useEffect } from 'react';
import styles from './RunModal.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number | null;
  duration: number;
  notes?: string;
  type?: string;
  plan_week?: number | null;
  plan_day?: number | null;
  avg_bpm?: number | null;
  rucking_weight?: number | null;
}

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (runData: {
    id?: string;
    date: string;
    distance: number | null;
    duration: number;
    notes: string;
    type: string;
    plan_week?: number | null;
    plan_day?: number | null;
    avg_bpm?: number | null;
    rucking_weight?: number | null;
  }) => void;
  onDelete?: (id: string) => void;
  selectedDate: string;
  existingRun: Run | null;
  defaultType?: string;
  defaultPlanWeek?: number | null;
  defaultPlanDay?: number | null;
}

export default function RunModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  selectedDate,
  existingRun,
  defaultType = 'run',
  defaultPlanWeek = null,
  defaultPlanDay = null
}: RunModalProps) {
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('run');
  const [avgBpm, setAvgBpm] = useState('');
  const [planWeek, setPlanWeek] = useState<number | null>(null);
  const [planDay, setPlanDay] = useState<number | null>(null);
  const [ruckingWeight, setRuckingWeight] = useState('');

  useEffect(() => {
    if (existingRun) {
      setDate(existingRun.date);
      setDistance(existingRun.distance !== null && existingRun.distance !== undefined ? existingRun.distance.toString() : '');
      setDuration(existingRun.duration.toString());
      setNotes(existingRun.notes || '');
      setType(existingRun.type || 'run');
      setAvgBpm(existingRun.avg_bpm?.toString() || '');
      setPlanWeek(existingRun.plan_week ?? null);
      setPlanDay(existingRun.plan_day ?? null);
      setRuckingWeight(existingRun.rucking_weight !== null && existingRun.rucking_weight !== undefined ? existingRun.rucking_weight.toString() : '');
    } else {
      setDate(selectedDate);
      setDistance('');
      setDuration('');
      setNotes('');
      setType(defaultType);
      setAvgBpm('');
      setPlanWeek(defaultPlanWeek);
      setPlanDay(defaultPlanDay);
      setRuckingWeight('');
    }
  }, [existingRun, selectedDate, isOpen, defaultType, defaultPlanWeek, defaultPlanDay]);

  const handleGpxImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
          alert('Error al leer el archivo GPX. Asegúrate de que sea un archivo XML válido.');
          return;
        }

        // 1. Get trackpoints
        const trkpts = xmlDoc.getElementsByTagName('trkpt');
        if (trkpts.length === 0) {
          alert('El archivo GPX no contiene puntos de recorrido (trackpoints).');
          return;
        }

        // 2. Extract Date (use first point's timestamp or metadata)
        let firstTimeStr = '';
        const timeNodes = xmlDoc.getElementsByTagName('time');
        
        // Find the first valid time in trkpts (in case metadata time is different)
        for (let i = 0; i < trkpts.length; i++) {
          const timeNode = trkpts[i].getElementsByTagName('time')[0];
          if (timeNode?.textContent) {
            firstTimeStr = timeNode.textContent;
            break;
          }
        }
        
        // Fallback to metadata time
        if (!firstTimeStr && timeNodes.length > 0) {
          firstTimeStr = timeNodes[0].textContent || '';
        }

        if (firstTimeStr) {
          const localDate = new Date(firstTimeStr);
          // Format as YYYY-MM-DD in local time
          const year = localDate.getFullYear();
          const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
          const day = localDate.getDate().toString().padStart(2, '0');
          setDate(`${year}-${month}-${day}`);
        }

        // 3. Calculate Distance using Haversine
        let totalDist = 0;
        const hrValues: number[] = [];

        for (let i = 0; i < trkpts.length; i++) {
          const pt = trkpts[i];
          const lat = parseFloat(pt.getAttribute('lat') || '0');
          const lon = parseFloat(pt.getAttribute('lon') || '0');

          if (i > 0) {
            const prevPt = trkpts[i - 1];
            const prevLat = parseFloat(prevPt.getAttribute('lat') || '0');
            const prevLon = parseFloat(prevPt.getAttribute('lon') || '0');
            
            // Haversine formula
            const R = 6371; // Earth radius in km
            const dLat = (lat - prevLat) * Math.PI / 180;
            const dLon = (lon - prevLon) * Math.PI / 180;
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(prevLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;
            
            // Skip points that represent GPS jumps (e.g. > 100m in 1 second is unrealistic)
            if (dist < 0.2) {
              totalDist += dist;
            }
          }

          // Extract Heart Rate (BPM)
          // Zepp puts it in extensions: <gpxtpx:hr> or <hr>
          let hrNode = pt.getElementsByTagName('gpxtpx:hr')[0] || pt.getElementsByTagName('hr')[0];
          if (!hrNode) {
            const extensions = pt.getElementsByTagName('extensions')[0];
            if (extensions) {
              const hrTags = extensions.getElementsByTagName('*');
              for (let j = 0; j < hrTags.length; j++) {
                if (hrTags[j].nodeName.endsWith('hr')) {
                  hrNode = hrTags[j];
                  break;
                }
              }
            }
          }

          if (hrNode?.textContent) {
            const hrVal = parseInt(hrNode.textContent, 10);
            if (!isNaN(hrVal) && hrVal > 0) {
              hrValues.push(hrVal);
            }
          }
        }

        setDistance(parseFloat(totalDist.toFixed(2)).toString());

        // 4. Calculate Duration (difference in time between last and first trackpoint)
        let lastTimeStr = '';
        for (let i = trkpts.length - 1; i >= 0; i--) {
          const timeNode = trkpts[i].getElementsByTagName('time')[0];
          if (timeNode?.textContent) {
            lastTimeStr = timeNode.textContent;
            break;
          }
        }

        if (firstTimeStr && lastTimeStr) {
          const t1 = new Date(firstTimeStr).getTime();
          const t2 = new Date(lastTimeStr).getTime();
          const diffMin = Math.round((t2 - t1) / 1000 / 60);
          if (diffMin > 0) {
            setDuration(diffMin.toString());
          }
        }

        // 5. Calculate Average BPM
        if (hrValues.length > 0) {
          const sumHr = hrValues.reduce((a, b) => a + b, 0);
          const avgHr = Math.round(sumHr / hrValues.length);
          setAvgBpm(avgHr.toString());
        }

        // 6. Try to guess type based on track name
        const trkNameNode = xmlDoc.getElementsByTagName('name')[0];
        if (trkNameNode?.textContent) {
          const nameLower = trkNameNode.textContent.toLowerCase();
          if (nameLower.includes('rucking') || nameLower.includes('ruck')) {
            setType('rucking');
          } else if (nameLower.includes('interval') || nameLower.includes('series')) {
            setType('interval');
          } else if (nameLower.includes('fondo') || nameLower.includes('long run')) {
            setType('fondo');
          }
        }

        alert('¡Datos del GPX importados con éxito!');

      } catch (err) {
        console.error('Error importando GPX:', err);
        alert('Hubo un error al procesar el archivo GPX.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isRuckingType = type === 'rucking';
    if (!date || (!isRuckingType && !distance) || !duration) {
      alert('Por favor completa los campos requeridos.');
      return;
    }

    const distNum = distance ? parseFloat(distance) : null;
    const durNum = parseInt(duration, 10);
    const bpmNum = avgBpm ? parseInt(avgBpm, 10) : null;
    const weightNum = isRuckingType && ruckingWeight ? parseFloat(ruckingWeight) : null;

    if (!isRuckingType && (distNum === null || isNaN(distNum) || distNum <= 0)) {
      alert('La distancia debe ser un número positivo.');
      return;
    }

    if (isRuckingType && distance && (distNum === null || isNaN(distNum) || distNum <= 0)) {
      alert('La distancia debe ser un número positivo.');
      return;
    }

    if (isNaN(durNum) || durNum <= 0) {
      alert('La duración debe ser mayor a 0 minutos.');
      return;
    }

    if (bpmNum !== null && (isNaN(bpmNum) || bpmNum <= 0)) {
      alert('Las pulsaciones (BPM) deben ser un número positivo.');
      return;
    }

    onSubmit({
      id: existingRun?.id,
      date,
      distance: distNum,
      duration: durNum,
      notes,
      type,
      plan_week: planWeek,
      plan_day: planDay,
      avg_bpm: bpmNum,
      rucking_weight: weightNum
    });
    onClose();
  };

  const handleDelete = () => {
    if (existingRun?.id && onDelete) {
      if (confirm('¿Estás seguro de que quieres eliminar este entrenamiento?')) {
        onDelete(existingRun.id);
        onClose();
      }
    }
  };

  const showBpmWarning = avgBpm && parseInt(avgBpm, 10) > 145;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-panel fade-in`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {existingRun ? 'Editar Sesión' : 'Registrar Sesión'}
            {planWeek && ` (Semana ${planWeek} - Día ${planDay})`}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.closeIcon}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.gpxImportContainer}>
            <label htmlFor="gpx-file-input" className={styles.gpxLabel}>
              📥 Importar desde archivo GPX (Zepp / Amazfit)
            </label>
            <input
              id="gpx-file-input"
              type="file"
              accept=".gpx"
              className={styles.gpxFileInput}
              onChange={handleGpxImport}
            />
          </div>

          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-date">Fecha</label>
              <input
                id="run-date"
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-type">Tipo de Actividad</label>
              <select
                id="run-type"
                className="form-control"
                value={type}
                onChange={e => setType(e.target.value)}
                required
              >
                <option value="run">Trote General</option>
                <option value="interval">Trote (Intervalos)</option>
                <option value="rucking">Rucking (Carga)</option>
                <option value="fondo">Trote (Fondo)</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-distance">
                Distancia (km) {type === 'rucking' ? '(Opcional)' : ''}
              </label>
              <input
                id="run-distance"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="ej. 5.2"
                className="form-control"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required={type !== 'rucking'}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-duration">Duración (minutos)</label>
              <input
                id="run-duration"
                type="number"
                min="1"
                placeholder="ej. 30"
                className="form-control"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          {type === 'rucking' && (
            <div className="form-group">
              <label htmlFor="run-weight">Carga de la Mochila (kg)</label>
              <input
                id="run-weight"
                type="number"
                step="0.1"
                min="0"
                placeholder="ej. 10.0"
                className="form-control"
                value={ruckingWeight}
                onChange={e => setRuckingWeight(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="run-bpm">Frecuencia Cardíaca Promedio (BPM)</label>
            <input
              id="run-bpm"
              type="number"
              min="40"
              max="220"
              placeholder="ej. 138 (Opcional)"
              className="form-control"
              value={avgBpm}
              onChange={e => setAvgBpm(e.target.value)}
            />
          </div>

          {showBpmWarning && (
            <div className={styles.bpmAlert}>
              ⚠️ <strong>Límite de Pulso Superado (145 BPM):</strong> El Plan Base indica que si tus BPM superan los 145, debes caminar hasta que bajen de 130. Recuerda mantener un control estricto de tu reloj.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="run-notes">Notas / ¿Cómo te sentiste?</label>
            <textarea
              id="run-notes"
              rows={3}
              placeholder="ej. Trote suave. Controlé el pulso al subir pendientes."
              className="form-control"
              style={{ resize: 'none' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            {existingRun && onDelete && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Eliminar
              </button>
            )}
            
            <div className={styles.rightActions}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
