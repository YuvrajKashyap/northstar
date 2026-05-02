import { Avatar } from '../common/Avatar'

export function ProfileCard() {
  return (
    <div className="profile-card">
      <Avatar name="Maya Patel" />
      <div>
        <strong>Maya Patel</strong>
        <span>maya.patel@example.com</span>
        <small>Demo User</small>
      </div>
    </div>
  )
}
