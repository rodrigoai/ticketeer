//This script is used in the checkout page to add read-only form inputs based on the ticket data passed in the URL or stored in the session storage.
//Call this script in the footer script like this:
//<script>
// document.addEventListener('DOMContentLoaded', () => {
//     setTimeout(() => {
//         addReadOnlyFormInputs(getTicketDataFromUrlOrStorage());
//     }, 2000); // 500ms timeout
// });
// </script>

function getTicketDataFromUrlOrStorage() {
            const url = new URL(window.location.href);

            const ticketsParam = url.searchParams.getAll('meta.tickets');
            const tableNumberParam = url.searchParams.getAll('meta.tableNumber');

            let dataString = {};

            if (ticketsParam.length > 0) {
                if (tableNumberParam.length > 0) {
                    dataString.meta = {
                        tickets: ticketsParam,
                        tableNumber: JSON.parse(tableNumberParam)
                    };
                } else {
                    dataString.meta = {
                        tickets: ticketsParam
                    };
                }
                sessionStorage.setItem('meta.tickets', JSON.stringify(ticketsParam));
                if (tableNumberParam.length > 0) {
                    sessionStorage.setItem('meta.tableNumber', JSON.stringify(tableNumberParam));
                }
                
            } else {
                const storedTickets = sessionStorage.getItem('meta.tickets');
                const storedTableNumber = sessionStorage.getItem('meta.tableNumber');

                dataString.meta = {
                    tickets: JSON.parse(storedTickets)
                };

                if (storedTableNumber) {
                    dataString.meta.tableNumber = JSON.parse(storedTableNumber);
                }

                dataString = JSON.stringify(dataString);
            }

            return dataString;
        }

function addReadOnlyFormInputs(dataString) {
    if (!dataString || document.querySelectorAll('form').length < 2) {
        console.log('No ticket data found in the dataString parameter, or the second form element was not found.');
        return;
    }

    const secondForm = document.querySelectorAll('form')[1];

    try {
        const createReadOnlyTextarea = (id, name, value) => {
            const textarea = document.createElement('textarea');
            textarea.id = id;
            textarea.name = name;
            textarea.readOnly = true;
            textarea.value = value ?? '';

            return textarea;
        };

        const ticketDataInput = createReadOnlyTextarea('ticketDataInput', 'meta.tickets', JSON.stringify(dataString.meta.tickets));
        const ticketTableInput = createReadOnlyTextarea('ticketTableInput', 'meta.tableNumber', JSON.stringify(dataString.meta.tableNumber));

        secondForm.appendChild(ticketDataInput);
        secondForm.appendChild(ticketTableInput);

    } catch (error) {
        console.error('Error handling ticket data:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addReadOnlyFormInputs(getTicketDataFromUrlOrStorage());
    }, 2000); // 500ms timeout
});