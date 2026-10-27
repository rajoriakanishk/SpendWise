import org.mindrot.jbcrypt.BCrypt;

public class PasswordHashTool {
    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage: java PasswordHashTool <password>");
            return;
        }

        System.out.println(BCrypt.hashpw(
                args[0],
                BCrypt.gensalt(12)
        ));
    }
}
