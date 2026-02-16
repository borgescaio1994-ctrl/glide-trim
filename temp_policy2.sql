"CREATE POLICY \"Allow insert appointments for clients\" ON appointments FOR INSERT WITH CHECK (auth.uid() = client_id);" 
