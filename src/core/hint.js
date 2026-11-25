// Home hint: one short caption plus a gesture (Play pulses, the new level opens, the progress gauge pulses)
// telling the player what to do next and why home looks the way it does. Pure: no DOM, no timers.
//
// Priority, highest first: a new level opened > the tune was just heard > three stars open the next
// level > a new player > a player switch > the child's own action on home (song switched, another level
// picked) > nothing happened for a while. The gesture carries the meaning; the text is a caption for
// those who read.

// from: how the player got to home or what just happened on it
//   'results' | 'demo' | 'newPlayer' | 'player' | 'song' | 'pick' | 'idle' | anything else (no hint)
// sel: selected level, cur: the song's current level, last: the top level index,
// played / levelUp: the game just finished (results only), name: the player's name.
export function homeHint({ from, sel, cur, last, played, levelUp, name }){
  switch (from){
    case 'results':
      if (levelUp) return { key: 'hLevelUp', level: cur, play: true, tile: 'unlock' };
      if (played === cur && cur < last) return { key: 'hGoal', level: cur + 1, tile: 'gauge' };
      return null;
    case 'demo': return { key: 'hAfterDemo', play: true };
    case 'newPlayer': return { key: 'hStart', play: true };
    case 'player': return name ? { key: 'hHello', name, play: true } : { key: 'hIdle', play: true };
    case 'song': return { key: 'hSong', level: cur, tile: 'cur' };
    case 'pick':
      if (sel < cur) return { key: 'hReplay', level: sel };
      if (sel > cur) return { key: 'hAhead', level: sel };
      return null;
    case 'idle': return { key: 'hIdle', play: true };
    default: return null;
  }
}
