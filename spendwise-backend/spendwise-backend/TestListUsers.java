import java.sql.SQLException;
import java.util.List;
import java.util.Scanner;

public class TestListUsers {
    public static void main(String[] args) {
        try (Scanner scanner = new Scanner(System.in)) {
            System.out.print("MySQL username: ");
            String username = scanner.nextLine();

            System.out.print("MySQL password: ");
            String password = scanner.nextLine();

            UserDAO dao = new UserDAO();
            List<User> users = dao.getAllUsers();

            System.out.println("Total users found: " + users.size());

            for (User user : users) {
                System.out.println(
                        user.getId() + " | "
                        + user.getFullName() + " | "
                        + user.getEmail() + " | "
                        + user.getRole()
                );
            }
        } catch (SQLException e) {
            System.out.println("Database query failed: " + e.getMessage());
        }
    }
}
