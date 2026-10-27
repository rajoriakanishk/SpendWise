import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.mindrot.jbcrypt.BCrypt;

/** Database operations used only by authenticated administrator endpoints. */
public class AdminDAO {
    public static class AdminUser {
        public int id;
        public String name, email, role, status, joined;
        public AdminUser(int id, String name, String email, String role, String status, String joined) {
            this.id=id; this.name=name; this.email=email; this.role=role; this.status=status; this.joined=joined;
        }
    }
    public static class AdminTransaction {
        public int id, userId;
        public String user, type, category, date;
        public BigDecimal amount;
        public AdminTransaction(int id,int userId,String user,String category,BigDecimal amount,String date) {
            this.id=id; this.userId=userId; this.user=user; this.type="Expense"; this.category=category; this.amount=amount; this.date=date;
        }
    }
    public static class AdminCategory {
        public int id;
        public String name, icon, color, status;
        public AdminCategory(int id,String name,String icon,String color,String status) {
            this.id=id; this.name=name; this.icon=icon; this.color=color; this.status=status;
        }
    }
    public static class Dashboard {
        public int users, transactions;
        public BigDecimal spending, savings;
    }

    public List<AdminUser> getUsers() throws SQLException {
        List<AdminUser> rows=new ArrayList<>();
        String sql="SELECT id,full_name,email,role,status,created_at FROM users ORDER BY id";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql); ResultSet r=s.executeQuery()) {
            while(r.next()) {
                java.sql.Timestamp created=r.getTimestamp("created_at");
                String joined=created==null ? "" : created.toLocalDateTime().toLocalDate().toString();
                rows.add(new AdminUser(r.getInt("id"),r.getString("full_name"),r.getString("email"),r.getString("role"),r.getString("status"),joined));
            }
        }
        return rows;
    }

    public int createUser(String name,String email,String password,String role,String status) throws SQLException {
        if(name==null || name.isBlank() || email==null || email.isBlank() || password==null || password.length()<8)
            throw new IllegalArgumentException("Name, email, and a password of at least 8 characters are required.");
        String normalizedRole=normalizeRole(role), normalizedStatus=normalizeStatus(status);
        String sql="INSERT INTO users(full_name,email,password_hash,role,status) VALUES(?,?,?,?,?)";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
            s.setString(1,name.trim()); s.setString(2,email.trim().toLowerCase(java.util.Locale.ROOT));
            s.setString(3,BCrypt.hashpw(password,BCrypt.gensalt(12))); s.setString(4,normalizedRole); s.setString(5,normalizedStatus);
            s.executeUpdate();
            try(ResultSet keys=s.getGeneratedKeys()){ if(keys.next()) return keys.getInt(1); }
        } catch(java.sql.SQLIntegrityConstraintViolationException ex) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        throw new SQLException("Could not create user.");
    }

    public boolean updateUser(int id,String name,String email,String role,String status) throws SQLException {
        if(id<=0 || name==null || name.isBlank() || email==null || email.isBlank()) throw new IllegalArgumentException("Enter a valid name and email.");
        String sql="UPDATE users SET full_name=?,email=?,role=?,status=? WHERE id=?";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql)) {
            s.setString(1,name.trim()); s.setString(2,email.trim().toLowerCase(java.util.Locale.ROOT));
            s.setString(3,normalizeRole(role)); s.setString(4,normalizeStatus(status)); s.setInt(5,id);
            return s.executeUpdate()>0;
        } catch(java.sql.SQLIntegrityConstraintViolationException ex) {
            throw new IllegalArgumentException("That email is already registered.");
        }
    }

    public boolean deleteStudent(int id) throws SQLException {
        if(id<=0) return false;
        try(Connection c=DatabaseConnection.getConnection()) {
            c.setAutoCommit(false);
            try {
                String role=null;
                try(PreparedStatement q=c.prepareStatement("SELECT role FROM users WHERE id=? FOR UPDATE")) {
                    q.setInt(1,id); try(ResultSet r=q.executeQuery()){ if(r.next()) role=r.getString(1); }
                }
                if(role==null || "ADMIN".equalsIgnoreCase(role)) { c.rollback(); return false; }
                for(String table:new String[]{"expenses","monthly_budgets","savings_goals","category_limits"}) {
                    try(PreparedStatement d=c.prepareStatement("DELETE FROM "+table+" WHERE user_id=?")) { d.setInt(1,id); d.executeUpdate(); }
                }
                try(PreparedStatement d=c.prepareStatement("DELETE FROM users WHERE id=? AND role <> 'ADMIN'")) { d.setInt(1,id); boolean ok=d.executeUpdate()>0; c.commit(); return ok; }
            } catch(SQLException e) { c.rollback(); throw e; }
        }
    }

    public List<AdminTransaction> getTransactions() throws SQLException {
        List<AdminTransaction> rows=new ArrayList<>();
        String sql="SELECT e.id,e.user_id,u.full_name,e.category,e.amount,e.expense_date FROM expenses e JOIN users u ON u.id=e.user_id ORDER BY e.expense_date DESC,e.id DESC";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql); ResultSet r=s.executeQuery()) {
            while(r.next()) rows.add(new AdminTransaction(r.getInt("id"),r.getInt("user_id"),r.getString("full_name"),r.getString("category"),r.getBigDecimal("amount"),r.getDate("expense_date").toLocalDate().toString()));
        }
        return rows;
    }
    public int createTransaction(int userId,String category,BigDecimal amount,LocalDate date,String description) throws SQLException {
        validateTransaction(userId,category,amount,date);
        String sql="INSERT INTO expenses(user_id,expense_date,description,category,amount) VALUES(?,?,?,?,?)";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
            s.setInt(1,userId);s.setDate(2,java.sql.Date.valueOf(date));s.setString(3,(description==null||description.isBlank())?category:description.trim());s.setString(4,category.trim());s.setBigDecimal(5,amount);s.executeUpdate();
            try(ResultSet keys=s.getGeneratedKeys()){if(keys.next())return keys.getInt(1);}
        }
        throw new SQLException("Could not create transaction.");
    }
    public boolean updateTransaction(int id,int userId,String category,BigDecimal amount,LocalDate date,String description) throws SQLException {
        validateTransaction(userId,category,amount,date);
        String sql="UPDATE expenses SET user_id=?,expense_date=?,description=?,category=?,amount=? WHERE id=?";
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement(sql)) {
            s.setInt(1,userId);s.setDate(2,java.sql.Date.valueOf(date));s.setString(3,(description==null||description.isBlank())?category:description.trim());s.setString(4,category.trim());s.setBigDecimal(5,amount);s.setInt(6,id);return s.executeUpdate()>0;
        }
    }
    public boolean deleteTransaction(int id) throws SQLException {
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("DELETE FROM expenses WHERE id=?")) {s.setInt(1,id);return s.executeUpdate()>0;}
    }
    private void validateTransaction(int userId,String category,BigDecimal amount,LocalDate date) {
        if(userId<=0||category==null||category.isBlank()||category.length()>80||amount==null||amount.compareTo(BigDecimal.ZERO)<=0||amount.scale()>2||amount.precision()>12||date==null)
            throw new IllegalArgumentException("Enter a valid student, category, positive amount, and date.");
    }

    public List<AdminCategory> getCategories() throws SQLException {
        List<AdminCategory> rows=new ArrayList<>();
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("SELECT id,name,icon,color,status FROM categories ORDER BY name"); ResultSet r=s.executeQuery()) {
            while(r.next()) rows.add(new AdminCategory(r.getInt("id"),r.getString("name"),r.getString("icon"),r.getString("color"),r.getString("status")));
        }
        return rows;
    }
    public int createCategory(String name,String icon,String color) throws SQLException {
        validateCategory(name,icon,color);
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("INSERT INTO categories(name,icon,color,status) VALUES(?,?,?,'Active')",Statement.RETURN_GENERATED_KEYS)) {
            s.setString(1,name.trim());s.setString(2,icon.trim());s.setString(3,color);s.executeUpdate();
            try(ResultSet k=s.getGeneratedKeys()){if(k.next())return k.getInt(1);}
        } catch(java.sql.SQLIntegrityConstraintViolationException e){throw new IllegalArgumentException("That category already exists.");}
        throw new SQLException("Could not create category.");
    }
    public boolean updateCategory(int id,String name,String icon,String color,String status) throws SQLException {
        validateCategory(name,icon,color);
        if(!"Active".equalsIgnoreCase(status)&&!"Inactive".equalsIgnoreCase(status)) throw new IllegalArgumentException("Invalid category status.");
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("UPDATE categories SET name=?,icon=?,color=?,status=? WHERE id=?")) {
            s.setString(1,name.trim());s.setString(2,icon.trim());s.setString(3,color);s.setString(4,status);s.setInt(5,id);return s.executeUpdate()>0;
        } catch(java.sql.SQLIntegrityConstraintViolationException e){throw new IllegalArgumentException("That category already exists.");}
    }
    public boolean deleteCategory(int id) throws SQLException {
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("DELETE FROM categories WHERE id=?")) {s.setInt(1,id);return s.executeUpdate()>0;}
    }
    private void validateCategory(String name,String icon,String color) {
        if(name==null||name.isBlank()||name.trim().length()>80||icon==null||icon.isBlank()||icon.length()>16||color==null||!color.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Enter a category name, short icon, and valid hex color.");
    }

    public boolean isActiveUser(int userId) throws SQLException {
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("SELECT status FROM users WHERE id=?")) {
            s.setInt(1,userId);
            try(ResultSet r=s.executeQuery()){ return r.next() && "Active".equalsIgnoreCase(r.getString("status")); }
        }
    }

    public List<AdminCategory> getActiveCategories() throws SQLException {
        List<AdminCategory> rows=new ArrayList<>();
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("SELECT id,name,icon,color,status FROM categories WHERE status='Active' ORDER BY name"); ResultSet r=s.executeQuery()) {
            while(r.next()) rows.add(new AdminCategory(r.getInt("id"),r.getString("name"),r.getString("icon"),r.getString("color"),r.getString("status")));
        }
        return rows;
    }

    public Dashboard getDashboard() throws SQLException {
        Dashboard d=new Dashboard();
        try(Connection c=DatabaseConnection.getConnection(); PreparedStatement s=c.prepareStatement("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM expenses) transactions,(SELECT COALESCE(SUM(amount),0) FROM expenses) spending,(SELECT COALESCE(SUM(saved_amount),0) FROM savings_goals) savings"); ResultSet r=s.executeQuery()) {
            if(r.next()){d.users=r.getInt("users");d.transactions=r.getInt("transactions");d.spending=r.getBigDecimal("spending");d.savings=r.getBigDecimal("savings");}
        }
        return d;
    }
    private String normalizeRole(String role) {
        if("ADMIN".equalsIgnoreCase(role)||"Admin".equalsIgnoreCase(role)) return "ADMIN";
        if("STUDENT".equalsIgnoreCase(role)||"Student".equalsIgnoreCase(role)) return "STUDENT";
        throw new IllegalArgumentException("Role must be Student or Admin.");
    }
    private String normalizeStatus(String status) {
        if(status==null||status.isBlank()||"Active".equalsIgnoreCase(status)) return "Active";
        if("Inactive".equalsIgnoreCase(status)) return "Inactive";
        throw new IllegalArgumentException("Status must be Active or Inactive.");
    }
}
