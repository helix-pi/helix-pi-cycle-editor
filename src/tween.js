
export default function tween (waypoints, time) {
  let previousWaypoint;
  let nextWaypoint;

  for (let waypoint of waypoints) {
    if (waypoint.time === time) {
      return {
        x: waypoint.position.x,
        y: waypoint.position.y
      };
    }

    if (waypoint.time < time) {
      previousWaypoint = waypoint;
    } else {
      nextWaypoint = waypoint;
    }

    if (previousWaypoint && nextWaypoint) {
      return tweenWaypoints(previousWaypoint, nextWaypoint, time);
    }
  }
}

function tweenWaypoints (previousWaypoint, nextWaypoint, time) {
  const distanceBetweenWaypoints = {
    x: nextWaypoint.position.x - previousWaypoint.position.x,
    y: nextWaypoint.position.y - previousWaypoint.position.y
  };

  const timeDistanceBetweenWaypoints = nextWaypoint.time - previousWaypoint.time;
  const timeRelativeToPreviousWaypoint = time - previousWaypoint.time;

  const tweenRatio = timeRelativeToPreviousWaypoint / timeDistanceBetweenWaypoints;

  return {
    x: previousWaypoint.position.x + distanceBetweenWaypoints.x * tweenRatio,
    y: previousWaypoint.position.y + distanceBetweenWaypoints.y * tweenRatio
  };
}

// Given an array of waypoints with time, and a time to tween to
// Iterate through the waypoints
  // Given a waypoint
  // If it matches the exact time, return it
  // Otherwise
  // If it is before the time, set it as the previous
  // If it is after the time, set it as the after
  // If we have found both a previous and after
    // Return a tweened waypoint between them
