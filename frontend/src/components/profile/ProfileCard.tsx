import { Avatar } from '../common/Avatar'

export function ProfileCard() {
  const name = localStorage.getItem('northstar.activeUserName')?.trim() || 'Northstar user'
  const email = localStorage.getItem('northstar.activeUserEmail')?.trim() || 'No email on file'
  return (
    <div className="profile-card">
      <Avatar name={name} />
      <div>
        <strong>{name}</strong>
        <span>{email}</span>
        <small>Member</small>
      </div>
    </div>
  )
}
