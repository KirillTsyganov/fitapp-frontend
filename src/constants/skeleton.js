// Side-view rig: `left_*` is the near side, `right_*` the far side (drawn dimmer for depth).
export const SKELETON_BONES = [
  { from: 'head', to: 'neck' },
  { from: 'neck', to: 'pelvis' },

  { from: 'neck', to: 'left_shoulder' },
  { from: 'left_shoulder', to: 'left_elbow' },
  { from: 'left_elbow', to: 'left_wrist' },

  { from: 'neck', to: 'right_shoulder' },
  { from: 'right_shoulder', to: 'right_elbow' },
  { from: 'right_elbow', to: 'right_wrist' },

  { from: 'pelvis', to: 'left_hip' },
  { from: 'left_hip', to: 'left_knee' },
  { from: 'left_knee', to: 'left_ankle' },
  { from: 'left_ankle', to: 'left_foot' },

  { from: 'pelvis', to: 'right_hip' },
  { from: 'right_hip', to: 'right_knee' },
  { from: 'right_knee', to: 'right_ankle' },
  { from: 'right_ankle', to: 'right_foot' },
]

export const BACKGROUND_PREFIX = 'right_'
