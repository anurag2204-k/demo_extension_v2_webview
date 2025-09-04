def display_menu(options):
    """Displays a menu of options."""
    for i, option in enumerate(options, 1):
        print(f"{i}. {option}")

def get_user_choice(prompt, max_value):
    """Gets a valid integer choice from the user."""
    while True:
        try:
            choice = int(input(prompt))
            if 1 <= choice <= max_value:
                return choice
            else:
                print(f"Please enter a number between 1 and {max_value}.")
        except ValueError:
            print("Invalid input. Please enter a number.")
