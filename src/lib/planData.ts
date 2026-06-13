export interface PlanWorkout {
  dayNum: 1 | 2 | 3;
  name: string;
  description: string;
  duration: number; // en minutos, 0 si es basado puramente en distancia
  distance: number; // en km, 0 si es basado puramente en tiempo
  workoutType: 'interval' | 'rucking' | 'fondo';
}

export interface PlanWeek {
  weekNum: number;
  workouts: PlanWorkout[];
}

export const TRAINING_PLAN_10K: PlanWeek[] = [
  {
    weekNum: 1,
    workouts: [
      {
        dayNum: 1,
        name: 'Intervalos Aeróbicos',
        workoutType: 'interval',
        duration: 30,
        distance: 0,
        description: '30 minutos totales. Alterna 3 min de trote muy suave con 2 min de caminata ágil. Controla estrictamente que tu pulso no suba de 145 BPM.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 45,
        distance: 0,
        description: 'Caminata por senderos con tu carga habitual. Trabajo aeróbico de base para fortalecer tendones sin alto impacto. Mantén un ritmo donde puedas respirar por la nariz.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 40,
        distance: 0,
        description: '40 minutos a ritmo muy suave. Si vas más lento que un peatón apurado está perfecto. Camina si tu pulso sube de 145 BPM y retoma el trote cuando baje de 130.',
      },
    ],
  },
  {
    weekNum: 2,
    workouts: [
      {
        dayNum: 1,
        name: 'Intervalos Aeróbicos',
        workoutType: 'interval',
        duration: 30,
        distance: 0,
        description: '30 minutos totales. Alterna 3 min de trote muy suave con 2 min de caminata ágil. Mantén el pulso < 145 BPM.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 45,
        distance: 0,
        description: 'Sesión de rucking con carga en terreno natural. Enfoque en base aeróbica y respiración nasal.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 40,
        distance: 0,
        description: '40 minutos corriendo/caminando según pulso. Control estricto de frecuencia cardíaca.',
      },
    ],
  },
  {
    weekNum: 3,
    workouts: [
      {
        dayNum: 1,
        name: 'Intervalos Aeróbicos Avanzados',
        workoutType: 'interval',
        duration: 40,
        distance: 0,
        description: '40 minutos totales. Alterna 5 min de trote con 1 min de caminata. Detén el trote si el pulso pasa los 145 BPM.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 50,
        distance: 0,
        description: 'Sesión de rucking de 50 minutos. Fortalecimiento de articulaciones y resistencia aeróbica.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 50,
        distance: 0,
        description: '50 minutos a ritmo muy suave. Alterna trote y caminata según el rango de pulso (130-145 BPM).',
      },
    ],
  },
  {
    weekNum: 4,
    workouts: [
      {
        dayNum: 1,
        name: 'Intervalos Aeróbicos Avanzados',
        workoutType: 'interval',
        duration: 40,
        distance: 0,
        description: '40 minutos totales. Alterna 5 min de trote con 1 min de caminata. Controla tu reloj y pulso.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 50,
        distance: 0,
        description: 'Sesión de rucking de 50 minutos. Ritmo constante, respiración nasal constante.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 50,
        distance: 0,
        description: '50 minutos a ritmo conversacional. Enfócate en pasar tiempo de calidad de pie.',
      },
    ],
  },
  {
    weekNum: 5,
    workouts: [
      {
        dayNum: 1,
        name: 'Trote Continuo Progresivo',
        workoutType: 'interval',
        duration: 45,
        distance: 0,
        description: 'Trote continuo de 45 minutos. Detente a caminar únicamente si el pulso sube de 145 BPM. Camina hasta bajar a 130 y reinicia.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 60,
        distance: 0,
        description: 'Aumentamos a 60 minutos de rucking con carga habitual. Excelente fortalecimiento general.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 60,
        distance: 0,
        description: '60 minutos. El ritmo no importa en lo absoluto, solo el tiempo de ejercicio y el control de pulso.',
      },
    ],
  },
  {
    weekNum: 6,
    workouts: [
      {
        dayNum: 1,
        name: 'Trote Continuo Progresivo',
        workoutType: 'interval',
        duration: 50,
        distance: 0,
        description: 'Trote continuo de 50 minutos. Detente a caminar únicamente si el pulso sube de 145 BPM.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 60,
        distance: 0,
        description: '60 minutos de rucking. Trabajo aeróbico en senderos, manteniendo respiración nasal.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 60,
        distance: 0,
        description: '60 minutos. Trote suave y controlado.',
      },
    ],
  },
  {
    weekNum: 7,
    workouts: [
      {
        dayNum: 1,
        name: 'Trote Continuo Progresivo',
        workoutType: 'interval',
        duration: 55,
        distance: 0,
        description: 'Trote continuo de 55 minutos. Mantén el pulso por debajo de 145 BPM.',
      },
      {
        dayNum: 2,
        name: 'Rucking (Zona 2)',
        workoutType: 'rucking',
        duration: 60,
        distance: 0,
        description: '60 minutos de rucking con carga. Paso constante.',
      },
      {
        dayNum: 3,
        name: 'Fondo de Fin de Semana',
        workoutType: 'fondo',
        duration: 70,
        distance: 0,
        description: '70 minutos totales. Tu fondo más largo antes de la prueba. Recuerda: ritmo de conversación relajado.',
      },
    ],
  },
  {
    weekNum: 8,
    workouts: [
      {
        dayNum: 1,
        name: 'Trote Continuo de Mantenimiento',
        workoutType: 'interval',
        duration: 60,
        distance: 0,
        description: 'Trote continuo de 60 minutos. Controla el reloj y pulso, preparándote para el fin de semana.',
      },
      {
        dayNum: 2,
        name: 'Rucking Ligero',
        workoutType: 'rucking',
        duration: 45,
        distance: 0,
        description: '45 minutos de rucking ligero. Trabajo suave para mantener activos los músculos sin fatiga.',
      },
      {
        dayNum: 3,
        name: 'Prueba de 10K',
        workoutType: 'fondo',
        duration: 0,
        distance: 10,
        description: '¡Prueba de 10 kilómetros! Busca completarlos a un ritmo fluido y cómodo donde puedas mantener una conversación.',
      },
    ],
  },
];
