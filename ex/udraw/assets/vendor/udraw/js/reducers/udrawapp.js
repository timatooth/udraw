const initialState = {
  client: {
      state: {
          tool: 'move',
          color: '#222222',
          size: 4,
          opacity: 1
      },
      x: 0,
      y: 0,
      m1Down: false,
      offsetX: 0,
      offsetY: 0,
      points: [],
      pointCount: 0
  },
  clientStates: {} /* network clients */
}


export function udrawAppReducer(state, action) {
  if (typeof state === 'undefined') {
    return initialState
  }

  // For now, don’t handle any actions
  // and just return the state given to us.
  return state
}