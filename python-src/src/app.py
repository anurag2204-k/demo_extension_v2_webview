from . import llm_handler
from . import utils

def run():
    """Main function to run the newsletter generator CLI."""
    print("Welcome to the AI Newsletter Generator!")
    topic = input("What is the topic of your newsletter? ")

    # Phase 1: Generate initial headings
    print("\nGenerating section headings...")
    headings = llm_handler.generate_headings(topic)

    # Phase 2: Section Planning Loop
    while True:
        print("\nHere are the current section headings:")
        utils.display_menu(headings)
        
        action = input("\nWhat would you like to do? (add/edit/delete/continue): ").lower()

        if action == 'add':
            new_heading = input("Enter the new heading: ")
            position = utils.get_user_choice("Enter the position to add the new heading: ", len(headings) + 1)
            headings.insert(position - 1, new_heading)
        elif action == 'edit':
            position = utils.get_user_choice("Enter the heading number to edit: ", len(headings))
            new_heading = input("Enter the new heading text: ")
            headings[position - 1] = new_heading
        elif action == 'delete':
            position = utils.get_user_choice("Enter the heading number to delete: ", len(headings))
            headings.pop(position - 1)
        elif action == 'continue':
            break
        else:
            print("Invalid action. Please choose 'add', 'edit', 'delete', or 'continue'.")

    # Phase 3: Section Content Writing Loop
    newsletter_content = {}
    for heading in headings:
        while True:
            print(f"\nGenerating content for section: '{heading}'...")
            content = llm_handler.generate_content(topic, heading)
            print("\n--- Generated Content ---")
            print(content)
            print("-----------------------")

            action = input("\nWhat would you like to do? (accept/regenerate/edit): ").lower()

            if action == 'accept':
                newsletter_content[heading] = content
                break
            elif action == 'regenerate':
                continue
            elif action == 'edit':
                print("Please edit the content manually. When you are done, save it and press Enter here.")
                # In a real CLI, you might open a temp file in an editor.
                # For this simple version, we'll just take multiline input.
                print("Enter your edited content. Type 'END' on a new line to finish.")
                edited_content = []
                while True:
                    line = input()
                    if line == 'END':
                        break
                    edited_content.append(line)
                newsletter_content[heading] = "\n".join(edited_content)
                break
            else:
                print("Invalid action. Please choose 'accept', 'regenerate', or 'edit'.")

    # Phase 4: Final Newsletter
    print("\n--- Your Final Newsletter ---")
    print(f"\n# {topic.title()}\n")
    for heading, content in newsletter_content.items():
        print(f"## {heading}\n")
        print(content)
        print("\n---\n")

    # Optional: Save to file
    save_option = input("Would you like to save the newsletter to a file? (yes/no): ").lower()
    if save_option == 'yes':
        filename = f"{topic.replace(' ', '_').lower()}_newsletter.md"
        with open(filename, 'w') as f:
            f.write(f"# {topic.title()}\n\n")
            for heading, content in newsletter_content.items():
                f.write(f"## {heading}\n\n")
                f.write(content)
                f.write("\n\n---\n\n")
        print(f"Newsletter saved to {filename}")

    print("\nThank you for using the AI Newsletter Generator!")
