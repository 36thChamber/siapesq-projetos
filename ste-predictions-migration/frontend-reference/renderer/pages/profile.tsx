import SideBar from "../components/atoms/sideBar"
import ProfilePage from "../components/profile"

export default function Profile() {
  return (
    <div className="flex min-h-screen">
      <SideBar />
      <div className="flex-1 p-5">
        <ProfilePage />
      </div>
    </div>
  )
}
