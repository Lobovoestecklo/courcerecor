import { redirect } from 'next/navigation';

export default function HomePage() {
  // Перенаправляем на страницу логина, если пользователь не аутентифицирован
  redirect('/login');
}
