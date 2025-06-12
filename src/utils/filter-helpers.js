export function smartFilterRooms(rooms, query, currentUserId) {
  const q = query.toLowerCase()

  return rooms.filter(room => {
    // Matcha på roomName
    const nameMatch = room.roomName?.toLowerCase().includes(q)

    // Matcha på användare (ej du själv)
    const userMatch = room.users?.some(user => {
      if (user._id === currentUserId) return false
      const fullName = `${user.username || ''}`.toLowerCase()
      const tags = Array.isArray(user.tags) ? user.tags.join(' ').toLowerCase() : ''
      return fullName.includes(q) || tags.includes(q)
    })

    return nameMatch || userMatch
  })
}
