-- Corrigir problema de segurança: adicionar search_path para função update_link_click_count
CREATE OR REPLACE FUNCTION update_link_click_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas atualizar se for um evento de clique e tiver link_id
    IF NEW.event_type = 'click' AND NEW.link_id IS NOT NULL THEN
        UPDATE links 
        SET click_count = click_count + 1
        WHERE id = NEW.link_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';